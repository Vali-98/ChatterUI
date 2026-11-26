import { exportPreferences } from '../lib/backup/policy'
import { AppSettings } from '../lib/constants/appSettings'
import { Storage } from '../lib/constants/storageKeys'
import {
    readPreferences,
    writePreferences,
    preferencesSchema,
    type Preferences,
} from '../lib/backup/preferences'
import { remapAttachmentUri, manifestSchema } from '../lib/backup/format'
import { applyPendingRestore } from '../lib/backup/recovery'
import { Directory, File } from 'expo-file-system'

// Simulate files surviving a process restart, including Expo's moveSync URI mutation.
const mockDisk = new Map<string, string | null>()
let mockFailMove: string | undefined
jest.mock('expo-file-system', () => {
    class Entry {
        uri: string
        constructor(...parts: (string | { uri: string })[]) {
            this.uri = parts
                .map((part) => (typeof part === 'string' ? part : part.uri))
                .join('/')
                .replace(/\/+/g, '/')
                .replace('file:/', 'file:///')
                .replace(/\/$/, '')
        }
        get exists() {
            return mockDisk.has(this.uri)
        }
        create() {
            mockDisk.set(this.uri, null)
        }
        delete() {
            for (const key of mockDisk.keys())
                if (key === this.uri || key.startsWith(this.uri + '/')) mockDisk.delete(key)
        }
        moveSync(destination: Entry) {
            if (mockFailMove === destination.uri) {
                mockFailMove = undefined
                throw new Error('Disk failure')
            }
            const source = this.uri
            for (const [key, value] of [...mockDisk]) {
                if (key === source || key.startsWith(source + '/')) {
                    mockDisk.set(destination.uri + key.slice(source.length), value)
                    mockDisk.delete(key)
                }
            }
            this.uri = destination.uri
        }
        write(value: string) {
            mockDisk.set(this.uri, value)
        }
        textSync() {
            const value = mockDisk.get(this.uri)
            if (typeof value !== 'string') throw new Error('Missing file')
            return value
        }
    }
    return { Directory: Entry, File: Entry, Paths: { document: { uri: 'file:///document/' } } }
})
const storage = (initial: Record<string, string | boolean | number> = {}) => {
    const values = new Map(Object.entries(initial))
    return {
        values,
        getAllKeys: () => [...values.keys()],
        getString: (key: string) =>
            typeof values.get(key) === 'string' ? (values.get(key) as string) : undefined,
        getBoolean: (key: string) =>
            typeof values.get(key) === 'boolean' ? (values.get(key) as boolean) : undefined,
        getNumber: (key: string) =>
            typeof values.get(key) === 'number' ? (values.get(key) as number) : undefined,
        clearAll: () => values.clear(),
        set: (key: string, value: string | boolean | number | ArrayBuffer) => {
            if (value instanceof ArrayBuffer) throw new Error('Unexpected binary')
            values.set(key, value)
        },
    }
}
const write = (path: string, data: string) => new File('file:///document', path).write(data)
const read = (path: string) => new File('file:///document', path).textSync()
const envelope = (state: unknown) => JSON.stringify({ state, version: 3 })
const prepareRestore = () => {
    new Directory('file:///document', '.restore/payload').create()
    write('.restore/ready', '{}')
    write('.restore/payload/preferences.json', JSON.stringify({ [AppSettings.AutoScroll]: false }))
    write('.restore/payload/database.sqlite', 'new database')
    for (const name of ['characters', 'appAssets', 'attachments'])
        new Directory('file:///document', `.restore/payload/${name}`).create()
    write('.restore/payload/attachments/new.wav', 'new audio')
}
beforeEach(() => {
    mockDisk.clear()
    mockFailMove = undefined
})

test('preferences round-trip retains false and untouched Zustand envelopes', () => {
    const values = {
        [AppSettings.AutoScroll]: false,
        [Storage.Samplers]: envelope({ list: [] }),
        'migration.swipe_reasoning': true,
    }
    const source = storage(values)
    const snapshot = preferencesSchema.parse(readPreferences(source))
    const target = storage({ stale: 'remove me' })
    writePreferences(target, snapshot)
    expect(Object.fromEntries(target.values)).toEqual(values)
})

test('default export removes connection keys and device state while retaining connection ids', () => {
    const connection = { id: 8, key: 'private', endpoint: 'https://example.com' }
    const values = readPreferences(
        storage({
            [Storage.API]: envelope({ connections: [connection] }),
            [Storage.EngineData]: envelope({
                lastModel: { id: 3 },
                config: { devices: ['GPU'], n_ctx: 4096 },
            }),
            [Storage.TTS]: envelope({
                voice: { identifier: 'device-voice' },
                rate: 1.2,
                enabled: true,
            }),
            [Storage.Downloads]: 'download state',
            [Storage.KV]: 'kv state',
            [Storage.Logs]: 'logs',
            'other-preference': 'retained',
        })
    )
    const exported = exportPreferences(values, false)
    expect(JSON.parse(exported[Storage.API] as string).state.connections).toEqual([
        { ...connection, key: '' },
    ])
    expect(exported).not.toHaveProperty(Storage.Downloads)
    expect(exported).not.toHaveProperty(Storage.KV)
    expect(exported['other-preference']).toBe('retained')
    expect(JSON.parse(exported[Storage.TTS] as string).state).toEqual({ rate: 1.2, enabled: true })
    expect(JSON.parse(values[Storage.TTS] as string).state.voice.identifier).toBe('device-voice')
    expect(JSON.parse(exported[Storage.EngineData] as string).state).toEqual({
        config: { devices: [], n_ctx: 4096 },
    })
    expect(JSON.parse(values[Storage.API] as string).state.connections[0].key).toBe('private')
    expect(
        JSON.parse(exportPreferences(values, true)[Storage.API] as string).state.connections[0].key
    ).toBe('private')
})

test('media paths move between installations and traversal paths are rejected', () => {
    expect(
        remapAttachmentUri('file:///old/attachments/a.wav', 'file:///old/', 'file:///new/')
    ).toBe('file:///new/attachments/a.wav')
    for (const uri of [
        'file:///elsewhere/a.wav',
        'file:///old/attachments/../db.db',
        'file:///old/attachments/%2e%2e/db.db',
    ])
        expect(() => remapAttachmentUri(uri, 'file:///old/', 'file:///new/')).toThrow()
    expect(() => manifestSchema.parse({ format: 'other' })).toThrow()
})

test('replacement restores media, database and preferences while leaving models untouched', () => {
    prepareRestore()
    write('SQLite/db.db', 'old database')
    write('SQLite/db.db-wal', 'old WAL')
    new Directory('file:///document', 'attachments').create()
    write('attachments/old.wav', 'old audio')
    write('models/model.gguf', 'model')
    const kv = storage({ stale: 'old preference' })
    applyPendingRestore(kv)
    expect(read('SQLite/db.db')).toBe('new database')
    expect(new File('file:///document/SQLite/db.db-wal').exists).toBe(false)
    expect(new File('file:///document/attachments/old.wav').exists).toBe(false)
    expect(read('attachments/new.wav')).toBe('new audio')
    expect(read('models/model.gguf')).toBe('model')
    expect(Object.fromEntries(kv.values)).toEqual({ [AppSettings.AutoScroll]: false })
    expect(new Directory('file:///document/.restore').exists).toBe(false)
})

test('a failed replacement restores the original database, media, WAL and preferences', () => {
    prepareRestore()
    write('SQLite/db.db', 'old database')
    write('SQLite/db.db-wal', 'old WAL')
    new Directory('file:///document', 'attachments').create()
    write('attachments/old.wav', 'old audio')
    mockFailMove = 'file:///document/SQLite/db.db'
    const kv = storage({ [AppSettings.AutoScroll]: true })
    expect(applyPendingRestore(kv)).toBe('rolledBack')
    expect(read('SQLite/db.db')).toBe('old database')
    expect(read('SQLite/db.db-wal')).toBe('old WAL')
    expect(read('attachments/old.wav')).toBe('old audio')
    expect(new File('file:///document/attachments/new.wav').exists).toBe(false)
    expect(kv.values.get(AppSettings.AutoScroll)).toBe(true)
})

test('restart after interruption rolls back before opening the database', () => {
    prepareRestore()
    write('.restore/applying', '')
    write('.restore/existing.json', JSON.stringify(['db.db', 'attachments']))
    write(
        '.restore/rollback-preferences.json',
        JSON.stringify({
            [AppSettings.AutoScroll]: true,
        } satisfies Preferences)
    )
    write('.restore/rollback/db.db', 'old database')
    new Directory('file:///document', '.restore/rollback/attachments').create()
    write('.restore/rollback/attachments/old.wav', 'old audio')
    write('SQLite/db.db', 'new database')
    new Directory('file:///document', 'attachments').create()
    write('attachments/new.wav', 'new audio')
    const kv = storage({ [AppSettings.AutoScroll]: false })
    applyPendingRestore(kv)
    expect(read('SQLite/db.db')).toBe('old database')
    expect(read('attachments/old.wav')).toBe('old audio')
    expect(kv.values.get(AppSettings.AutoScroll)).toBe(true)
    expect(new Directory('file:///document/.restore').exists).toBe(false)
})

test('a committed restore is not rolled back if cleanup was interrupted', () => {
    prepareRestore()
    write('.restore/committed', '')
    write('SQLite/db.db', 'restored database')
    const kv = storage({ [AppSettings.AutoScroll]: false })
    applyPendingRestore(kv)
    expect(read('SQLite/db.db')).toBe('restored database')
    expect(kv.values.get(AppSettings.AutoScroll)).toBe(false)
    expect(new Directory('file:///document/.restore').exists).toBe(false)
})

test('model cleanup removes device-specific records and links while preserving other links', async () => {
    const { excludeModelData } = require('../lib/backup/policy')
    const { DatabaseSync } = process.getBuiltinModule('node:sqlite')!
    const database = new DatabaseSync(':memory:')
    try {
        database.exec(`
            PRAGMA foreign_keys = ON;
            CREATE TABLE model_data (id INTEGER PRIMARY KEY, file_path TEXT);
            CREATE TABLE model_mmproj_links (
                model_id INTEGER REFERENCES model_data(id),
                mmproj_id INTEGER REFERENCES model_data(id)
            );
            CREATE TABLE characterLinks (id INTEGER PRIMARY KEY, type TEXT, value INTEGER);
            INSERT INTO model_data VALUES (1, 'file:///old/models/model.gguf'), (2, 'content://linked-projector');
            INSERT INTO model_mmproj_links VALUES (1, 2);
            INSERT INTO characterLinks VALUES (1, 'model_id', 1), (2, 'connection_id', 7);
        `)
        await excludeModelData({ execAsync: async (sql: string) => database.exec(sql) })
        expect(database.prepare('SELECT * FROM model_data').all()).toEqual([])
        expect(database.prepare('SELECT * FROM model_mmproj_links').all()).toEqual([])
        expect(database.prepare('SELECT type, value FROM characterLinks').all()).toEqual([
            { type: 'connection_id', value: 7 },
        ])
    } finally {
        database.close()
    }
})
