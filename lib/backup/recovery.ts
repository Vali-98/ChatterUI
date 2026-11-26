// This module must stay independent of app stores and the open SQLite connection.
import { Directory, File, Paths } from 'expo-file-system'

import { AppDirectory } from '@lib/constants/directories'

import {
    preferencesSchema,
    writePreferences,
    readPreferences,
    type PreferenceStorage,
} from './preferences'

export const mediaDirectories = [
    AppDirectory.CharacterPath,
    AppDirectory.Assets,
    AppDirectory.Attachments,
].map((uri) => ({
    uri,
    name: uri.replace(/\/$/, '').split('/').pop()!,
}))
export const restoreDirectory = () => new Directory(Paths.document, '.restore')
const databaseDirectory = () => new Directory(Paths.document, 'SQLite')
const targets = () => [
    ...[
        ...mediaDirectories,
        { name: 'session', uri: AppDirectory.SessionPath },
        { name: 'downloads', uri: `${Paths.document.uri}downloads/` },
    ].map(({ name, uri }) => ({ name, target: new Directory(uri), directory: true })),
    ...['db.db', 'db.db-wal', 'db.db-shm', 'db.db-journal'].map((name) => ({
        name,
        target: new File(databaseDirectory(), name),
        directory: false,
    })),
]

// Applied before SQLite opens AND before any persisted store hydrates. An interrupted
// replacement is rolled back on the next launch, using the original files and MMKV.
export const applyPendingRestore = (storage: PreferenceStorage) => {
    const root = restoreDirectory()
    const marker = new File(root, 'ready')
    if (!marker.exists) return
    const applying = new File(root, 'applying')
    const committed = new File(root, 'committed')
    const existingFile = new File(root, 'existing.json')
    const rollback = new Directory(root, 'rollback')
    const rollbackStorage = new File(root, 'rollback-preferences.json')
    const payload = new Directory(root, 'payload')
    const revert = () => {
        const existing = JSON.parse(existingFile.textSync()) as string[]
        for (const item of targets()) {
            const saved = item.directory
                ? new Directory(rollback, item.name)
                : new File(rollback, item.name)
            if (saved.exists) {
                if (item.target.exists) item.target.delete()
                saved.moveSync(item.target)
            } else if (!existing.includes(item.name) && item.target.exists) item.target.delete()
        }
        writePreferences(storage, preferencesSchema.parse(JSON.parse(rollbackStorage.textSync())))
    }
    if (committed.exists) {
        root.delete()
        return
    }
    if (applying.exists) {
        revert()
        root.delete()
        return 'rolledBack' as const
    }
    const preferences = preferencesSchema.parse(
        JSON.parse(new File(payload, 'preferences.json').textSync())
    )
    rollback.create({ intermediates: true, idempotent: true })
    rollbackStorage.write(JSON.stringify(readPreferences(storage)))
    existingFile.write(
        JSON.stringify(
            targets()
                .filter((item) => item.target.exists)
                .map((item) => item.name)
        )
    )
    applying.create()
    try {
        databaseDirectory().create({ intermediates: true, idempotent: true })
        for (const item of targets()) {
            const targetUri = item.target.uri
            if (item.target.exists)
                item.target.moveSync(
                    item.directory
                        ? new Directory(rollback, item.name)
                        : new File(rollback, item.name)
                )
            const sourceName = item.name === 'db.db' ? 'database.sqlite' : item.name
            const source = item.directory
                ? new Directory(payload, sourceName)
                : new File(payload, sourceName)
            if (source.exists)
                source.moveSync(item.directory ? new Directory(targetUri) : new File(targetUri))
        }
        writePreferences(storage, preferences)
        committed.create()
    } catch {
        revert()
        root.delete()
        return 'rolledBack' as const
    }
    root.delete()
    return 'restored' as const
}
