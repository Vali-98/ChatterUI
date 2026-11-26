import { localDownload } from '@vali98/react-native-fs'
import { reloadAppAsync } from 'expo'
import { randomUUID } from 'expo-crypto'
import { Directory, File, Paths } from 'expo-file-system'
import { backupDatabaseAsync, openDatabaseAsync } from 'expo-sqlite'
import { zip, unzip, subscribe } from 'react-native-zip-archive'
import { drizzle } from 'drizzle-orm/expo-sqlite'
import { migrate } from 'drizzle-orm/expo-sqlite/migrator'
import migrations from '@db/migrations/migrations'

import appConfig from '@appconfig'
import { sqliteDB } from '@db/db'
import { useDeferredTaskState, isDeferredTaskActive } from '@lib/engine/generation/deferredState'
import { useLocalModelResourceState } from '@lib/engine/generation/localResource'
import { useGenerationState, isActiveGeneration } from '@lib/engine/generation/state'
import { useCharacterImportState } from '@lib/state/characters/importState'
import { mmkv } from '@lib/storage/MMKV'
import { useDownloadStore } from '@lib/downloads/store'
import { useAudioState } from '@lib/audio/state'
import { stopAudio } from '@lib/audio/player'
import { stopTTS } from '@lib/tts/player'

import { manifestSchema, remapAttachmentUri } from './format'
import { readPreferences, preferencesSchema } from './preferences'
import { exportPreferences, excludeModelData, excludedMediaFiles } from './policy'
import { mediaDirectories, restoreDirectory } from './recovery'

export type BackupProgress = (
    stage: 'preparing' | 'packing' | 'saving' | 'extracting' | 'validating' | 'restarting',
    progress?: number
) => void
const nativePath = (uri: string) => decodeURIComponent(uri.replace(/^file:\/\//, ''))
let busy = false
const assertIdle = () => {
    if (
        Object.values(useGenerationState.getState().generations).some(isActiveGeneration) ||
        Object.values(useDeferredTaskState.getState().tasks).some(isDeferredTaskActive) ||
        useLocalModelResourceState.getState().operations ||
        useCharacterImportState.getState().isImporting ||
        useAudioState.getState().recording ||
        useDownloadStore
            .getState()
            .downloads.some(
                (download) => download.status === 'downloading' || download.status === 'pausing'
            )
    )
        throw new Error(
            'Finish generation, model operations, recording and character imports, and pause downloads before backing up or restoring'
        )
}
const schemaTimestamp = async (database: typeof sqliteDB) =>
    (await database.getFirstAsync<{ timestamp: number }>(
        'SELECT COALESCE(MAX(created_at), 0) AS timestamp FROM __drizzle_migrations'
    ))!.timestamp

// Database-only snapshot for inspection; media and preferences are not included.
export const exportDatabase = async (report: BackupProgress) => {
    if (busy) throw new Error('A backup or restore is already running')
    busy = true
    const root = new Directory(Paths.cache, `database-export-${randomUUID()}`)
    try {
        root.create()
        report('preparing')
        const filename = `ChatterUI-${appConfig.expo.version}-${Date.now()}.db`
        const destination = await openDatabaseAsync(filename, {}, root.uri)
        try {
            await backupDatabaseAsync({ sourceDatabase: sqliteDB, destDatabase: destination })
            await destination.execAsync(
                'PRAGMA wal_checkpoint(TRUNCATE); PRAGMA journal_mode = DELETE;'
            )
        } finally {
            await destination.closeAsync()
        }
        report('saving')
        await localDownload(nativePath(new File(root, filename).uri))
    } finally {
        busy = false
        if (root.exists) root.delete()
    }
}

export const exportBackup = async (includeApiKeys: boolean, report: BackupProgress) => {
    if (busy) throw new Error('A backup or restore is already running')
    assertIdle()
    busy = true
    const root = new Directory(Paths.cache, `backup-${randomUUID()}`)
    try {
        root.create()
        const payload = new Directory(root, 'payload')
        payload.create()
        report('preparing')
        const destination = await openDatabaseAsync('database.sqlite', {}, payload.uri)
        try {
            await backupDatabaseAsync({ sourceDatabase: sqliteDB, destDatabase: destination })
            await destination.withTransactionAsync(() => excludeModelData(destination))
            await destination.execAsync('VACUUM;')
            await destination.execAsync(
                'PRAGMA wal_checkpoint(TRUNCATE); PRAGMA journal_mode = DELETE;'
            )
            const manifest = {
                format: 'chatterui-backup',
                version: 1,
                appVersion: appConfig.expo.version,
                createdAt: new Date().toISOString(),
                documentUri: Paths.document.uri,
                schemaTimestamp: await schemaTimestamp(destination),
                includesApiKeys: includeApiKeys,
            }
            new File(payload, 'manifest.json').write(JSON.stringify(manifest))
        } finally {
            await destination.closeAsync()
        }
        new File(payload, 'preferences.json').write(
            JSON.stringify(exportPreferences(readPreferences(mmkv), includeApiKeys))
        )
        for (const { name, uri } of mediaDirectories) {
            const source = new Directory(uri)
            const destination = new Directory(payload, name)
            destination.create()
            if (!source.exists) continue
            for (const item of source.list()) {
                if (excludedMediaFiles.has(item.uri)) continue
                await item.copy(
                    item instanceof Directory
                        ? new Directory(destination, item.name)
                        : new File(destination, item.name)
                )
            }
        }
        const archive = new File(
            root,
            `ChatterUI-backup-${new Date().toISOString().replace(/[:.]/g, '-')}.zip`
        )
        report('packing', 0)
        const subscription = subscribe(({ progress }) => report('packing', progress * 100))
        try {
            await zip(nativePath(payload.uri), nativePath(archive.uri))
        } finally {
            subscription.remove()
        }
        report('saving')
        await localDownload(nativePath(archive.uri))
    } finally {
        busy = false
        if (root.exists) root.delete()
    }
}

export const restoreBackup = async (uri: string, report: BackupProgress) => {
    if (busy) throw new Error('A backup or restore is already running')
    assertIdle()
    busy = true
    const root = restoreDirectory()
    let scheduled = new File(root, 'ready').exists
    try {
        if (scheduled) throw new Error('Restart the app to finish the pending restore')
        if (root.exists) root.delete()
        root.create()
        const archive = new File(root, 'backup.zip')
        await new File(uri).copy(archive)
        const payload = new Directory(root, 'payload')
        report('extracting', 0)
        const subscription = subscribe(({ progress }) => report('extracting', progress * 100))
        try {
            await unzip(nativePath(archive.uri), nativePath(payload.uri))
        } finally {
            subscription.remove()
        }
        archive.delete()
        report('validating')
        const manifest = manifestSchema.parse(
            JSON.parse(new File(payload, 'manifest.json').textSync())
        )
        preferencesSchema.parse(JSON.parse(new File(payload, 'preferences.json').textSync()))
        const allowed = new Set<string>([
            'manifest.json',
            'preferences.json',
            'database.sqlite',
            ...mediaDirectories.map(({ name }) => name),
        ])
        if (payload.list().some((item) => !allowed.has(item.name)))
            throw new Error('Unexpected files in backup')
        // Accept archives that omit empty media directories.
        for (const { name } of mediaDirectories)
            new Directory(payload, name).create({ idempotent: true })
        if (!new File(payload, 'database.sqlite').exists)
            throw new Error('Backup database is missing')
        const restored = await openDatabaseAsync(
            'database.sqlite',
            { useNewConnection: true },
            payload.uri
        )
        try {
            const check = await restored.getFirstAsync<{ integrity_check: string }>(
                'PRAGMA integrity_check'
            )
            if (check?.integrity_check !== 'ok') throw new Error('Backup database is damaged')
            const timestamp = await schemaTimestamp(restored)
            if (
                timestamp !== manifest.schemaTimestamp ||
                timestamp > (await schemaTimestamp(sqliteDB))
            )
                throw new Error('This backup needs a newer version of ChatterUI.')
            await restored.execAsync('PRAGMA foreign_keys = ON;')
            await migrate(drizzle(restored), migrations)
            const foreignKeys = await restored.getAllAsync('PRAGMA foreign_key_check')
            if (foreignKeys.length) throw new Error('Backup database contains broken references')
            const attachments = await restored.getAllAsync<{ id: number; uri: string }>(
                'SELECT id, uri FROM chat_attachment'
            )
            await restored.withTransactionAsync(async () => {
                for (const attachment of attachments) {
                    const newUri = remapAttachmentUri(
                        attachment.uri,
                        manifest.documentUri,
                        Paths.document.uri
                    )
                    const backupUri = remapAttachmentUri(
                        attachment.uri,
                        manifest.documentUri,
                        payload.uri
                    )
                    if (!new File(backupUri).exists)
                        throw new Error('A chat attachment is missing from the backup')
                    await restored.runAsync(
                        'UPDATE chat_attachment SET uri = ? WHERE id = ?',
                        newUri,
                        attachment.id
                    )
                }
                await excludeModelData(restored)
            })
            await restored.execAsync(
                'PRAGMA wal_checkpoint(TRUNCATE); PRAGMA journal_mode = DELETE;'
            )
        } finally {
            await restored.closeAsync()
        }
        assertIdle()
        stopAudio()
        await stopTTS()
        new File(root, 'ready').create()
        scheduled = true
        report('restarting')
        await reloadAppAsync()
    } catch (error) {
        // If reload fails, leave the validated restore for the next launch.
        if (!scheduled && root.exists) root.delete()
        throw error
    } finally {
        busy = false
    }
}
