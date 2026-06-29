/**
 * lib/state/Live2D.ts
 *
 * State management for Live2D models assigned per character.
 * Handles import (ZIP / .wks / .model3.json), deletion and path resolution.
 *
 * Model storage layout on-device:
 *   <Documents>/live2d/<charId>/<modelFolderName>/
 *     ├── *.model3.json   ← path stored in DB
 *     ├── *.moc3
 *     ├── *.physics3.json
 *     ├── textures/
 *     └── motions/
 */

import * as DocumentPicker from 'expo-document-picker'
import { Directory, File, Paths } from 'expo-file-system'
import { eq } from 'drizzle-orm'

import { db as database } from '@db'
import { characters } from 'db/schema'
import { Logger } from './Logger'

// ─── Directory helpers ────────────────────────────────────────────────────────

export const Live2DDirectory = {
    /** Root directory for all Live2D models: <Documents>/live2d/ */
    root: `${Paths.document.uri}live2d/`,
    /** Per-character sub-directory */
    forChar: (charId: number) => `${Paths.document.uri}live2d/${charId}/`,
}

/** Make sure the per-character directory exists */
const ensureCharDir = (charId: number) => {
    new Directory(Live2DDirectory.root).create({ idempotent: true })
    new Directory(Live2DDirectory.forChar(charId)).create({ idempotent: true })
}

// ─── DB helpers ──────────────────────────────────────────────────────────────

/** Write / clear the live2d_model_path column for a given character */
const setModelPathInDB = async (charId: number, modelPath: string | null) => {
    await database
        .update(characters)
        .set({ live2d_model_path: modelPath })
        .where(eq(characters.id, charId))
}

/** Read live2d_model_path for a given character */
export const getLive2DModelPath = async (charId: number): Promise<string | null> => {
    const row = await database.query.characters.findFirst({
        where: eq(characters.id, charId),
        columns: { live2d_model_path: true },
    })
    return row?.live2d_model_path ?? null
}

// ─── Import helpers ───────────────────────────────────────────────────────────

/**
 * Recursively copy a source directory (file:// URI) into destDir.
 * expo-file-system v15 exposes Directory.copy() but only inside the sandbox.
 * For content:// URIs we fall back to iterating files individually.
 */
const copyDirectoryContents = async (
    sourceFiles: Array<{ name: string; uri: string }>,
    destDirPath: string
) => {
    new Directory(destDirPath).create({ idempotent: true })
    for (const f of sourceFiles) {
        const dest = destDirPath + f.name
        try {
            new File(f.uri).copy(new File(dest))
        } catch {
            // skip unreadable files
        }
    }
}

/**
 * Extract a ZIP / .wks archive into the per-character Live2D folder.
 * Uses the pure-JS `fflate` library (add it with: npm install fflate).
 * Returns the path to the found .model3.json, or null on failure.
 */
const extractZipArchive = async (
    zipUri: string,
    destDir: string
): Promise<string | null> => {
    try {
        // Dynamic import so the app still works if fflate is missing
        const { unzipSync } = await import('fflate')

        const base64 = await new File(zipUri).base64()
        // base64 → Uint8Array
        const binary = Uint8Array.from(atob(base64), (c) => c.charCodeAt(0))
        const files = unzipSync(binary)

        new Directory(destDir).create({ idempotent: true })

        let model3Path: string | null = null

        for (const [relativePath, data] of Object.entries(files)) {
            if (relativePath.endsWith('/')) continue // directory entry
            const destPath = destDir + relativePath
            // Ensure sub-directories
            const dirPart = destPath.substring(0, destPath.lastIndexOf('/') + 1)
            new Directory(dirPart).create({ idempotent: true })
            // Write the file as base64
            const b64 = btoa(String.fromCharCode(...data))
            await new File(destPath).write(b64, { encoding: 'base64' })
            if (relativePath.endsWith('.model3.json') && !model3Path) {
                model3Path = destPath
            }
        }
        return model3Path
    } catch (e) {
        Logger.error('[Live2D] ZIP extraction failed: ' + e)
        Logger.errorToast(
            'Could not extract archive. Make sure fflate is installed:\nnpm install fflate'
        )
        return null
    }
}

// ─── Public API ───────────────────────────────────────────────────────────────

/**
 * Open the document picker and let the user import a Live2D model.
 *
 * Supported inputs:
 *   • .zip / .wks  → extracted into the per-character Live2D folder
 *   • .model3.json → the file (and its siblings) is copied into the folder
 *
 * The path to the .model3.json is then stored in the DB.
 */
export const importLive2DModel = async (charId: number): Promise<boolean> => {
    try {
        const result = await DocumentPicker.getDocumentAsync({
            copyToCacheDirectory: true,
            // Accept: archives (.zip/.wks) OR model3.json directly
            type: ['application/zip', 'application/octet-stream', 'application/json', '*/*'],
        })

        if (result.canceled || !result.assets?.[0]) return false

        const asset = result.assets[0]
        const name: string = asset.name ?? 'model'
        const uri: string = asset.uri
        const lower = name.toLowerCase()

        ensureCharDir(charId)
        const charDir = Live2DDirectory.forChar(charId)

        // ── ZIP / WKS ─────────────────────────────────────────────────────────
        if (lower.endsWith('.zip') || lower.endsWith('.wks')) {
            const folderName = name.replace(/\.(zip|wks)$/i, '')
            const destDir = charDir + folderName + '/'
            const model3Path = await extractZipArchive(uri, destDir)
            if (!model3Path) return false
            await setModelPathInDB(charId, model3Path)
            Logger.infoToast(`Live2D model "${folderName}" imported!`)
            return true
        }

        // ── model3.json ───────────────────────────────────────────────────────
        if (lower.endsWith('.model3.json')) {
            // Store path directly (the file is already accessible via its URI).
            // For robust offline access we copy it to our private storage.
            const folderName = name.replace('.model3.json', '')
            const destDir = charDir + folderName + '/'
            new Directory(destDir).create({ idempotent: true })
            const destPath = destDir + name
            new File(uri).copy(new File(destPath))
            await setModelPathInDB(charId, destPath)
            Logger.infoToast(
                `Live2D model "${folderName}" imported.\n` +
                'Tip: put all model files (moc3, textures…) in the same folder, ' +
                'then reimport via ZIP for best results.'
            )
            return true
        }

        Logger.warnToast('Unsupported file type. Please select a .zip, .wks or .model3.json file.')
        return false
    } catch (e) {
        Logger.errorToast('Failed to import Live2D model: ' + e)
        Logger.error('[Live2D] import error: ' + e)
        return false
    }
}

/**
 * Delete the per-character Live2D folder and clear the DB entry.
 */
export const deleteLive2DModel = async (charId: number): Promise<void> => {
    try {
        const dir = new Directory(Live2DDirectory.forChar(charId))
        if (dir.exists) dir.delete()
        await setModelPathInDB(charId, null)
        Logger.warnToast('Live2D model removed.')
    } catch (e) {
        Logger.errorToast('Failed to remove Live2D model: ' + e)
    }
}

// ─── Drizzle query helper (mirrors backgroundImageQuery pattern) ──────────────

export const live2dModelQuery = (charId: number) =>
    database.query.characters.findFirst({
        where: eq(characters.id, charId),
        columns: { live2d_model_path: true },
    })
