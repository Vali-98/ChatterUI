import { AppSettings, CONTINUATION_PROMPT_KEY, Global } from '../lib/constants/GlobalValues'
import { Storage } from '../lib/enums/Storage'
import { migrateMMKVKeys } from '../lib/storage/keyMigration'

const mockValues = new Map<string, string | number | boolean>()
const mockStorage = {
    contains: (key: string) => mockValues.has(key),
    getString: (key: string) => {
        const value = mockValues.get(key)
        return typeof value === 'string' ? value : undefined
    },
    getBoolean: (key: string) => {
        const value = mockValues.get(key)
        return typeof value === 'boolean' ? value : undefined
    },
    getNumber: (key: string) => {
        const value = mockValues.get(key)
        return typeof value === 'number' ? value : undefined
    },
    set: jest.fn((key: string, value: string | number | boolean | ArrayBuffer) => {
        if (value instanceof ArrayBuffer) throw new Error('Unexpected buffer')
        mockValues.set(key, value)
    }),
    remove: (key: string) => mockValues.delete(key),
}

jest.mock('react-native-mmkv', () => ({ createMMKV: () => mockStorage }))

beforeEach(() => {
    mockValues.clear()
    mockStorage.set.mockClear()
})

test('active root keys have distinct names and the expected prefixes', () => {
    const globals = [Global.CpuFeatures, Global.CPUThreads, Global.InstallTextIntentDisable]
    const keys = [
        ...Object.values(Storage),
        ...Object.values(AppSettings),
        ...globals,
        CONTINUATION_PROMPT_KEY,
    ]
    expect(new Set(keys).size).toBe(keys.length)
    expect(Object.values(Storage).every((key) => key.startsWith('storage-'))).toBe(true)
    expect(Object.values(AppSettings).every((key) => key.startsWith('settings-'))).toBe(true)
    expect(globals.every((key) => key.startsWith('global-'))).toBe(true)
})

test('moves store envelopes without modifying their payloads or persistence versions', () => {
    const connections = '{"state":{"connections":[{"id":7,"key":"test-key"}]},"version":3}'
    const samplers = '{"state":{"configList":[{"id":9,"name":"Saved"}]},"version":1}'
    mockValues.set('api-storage', connections)
    mockValues.set('samplerstate-storage', samplers)
    migrateMMKVKeys(mockStorage)
    expect(mockValues.get(Storage.API)).toBe(connections)
    expect(mockValues.get(Storage.Samplers)).toBe(samplers)
    expect(mockValues.has('api-storage')).toBe(false)
    expect(mockValues.has('samplerstate-storage')).toBe(false)
})

test('preserves false, zero and empty string values using their original types', () => {
    mockValues.set('createdefaultcard', false)
    mockValues.set('constants-cpu-threads', 0)
    mockValues.set('cpufeatures', '')
    mockValues.set('install-text-intent-disable', true)
    migrateMMKVKeys(mockStorage)
    expect(mockValues.get(AppSettings.CreateDefaultCard)).toBe(false)
    expect(mockValues.get(Global.CPUThreads)).toBe(0)
    expect(mockValues.get(Global.CpuFeatures)).toBe('')
    expect(mockValues.get(Global.InstallTextIntentDisable)).toBe(true)
})

test('an existing destination wins and removing the old alias prevents later resurrection', () => {
    mockValues.set('autoscroll', true)
    mockValues.set(AppSettings.AutoScroll, false)
    migrateMMKVKeys(mockStorage)
    expect(mockValues.get(AppSettings.AutoScroll)).toBe(false)
    expect(mockValues.has('autoscroll')).toBe(false)
    mockValues.delete(AppSettings.AutoScroll)
    migrateMMKVKeys(mockStorage)
    expect(mockValues.has(AppSettings.AutoScroll)).toBe(false)
})

test('a failed write retains the old key and a later attempt completes the migration', () => {
    mockValues.set('downloads', 'saved downloads')
    mockStorage.set.mockImplementationOnce(() => {
        throw new Error('write failed')
    })
    expect(() => migrateMMKVKeys(mockStorage)).toThrow('write failed')
    expect(mockValues.get('downloads')).toBe('saved downloads')
    migrateMMKVKeys(mockStorage)
    expect(mockValues.get(Storage.Downloads)).toBe('saved downloads')
    expect(mockValues.has('downloads')).toBe(false)
})

test('leaves historical migration inputs and unexpected value types untouched', () => {
    const values = {
        localmodel: '{"name":"Old model"}',
        appmode: 'remote',
        ttsauto: true,
        ttsspeaker: '{"identifier":"voice"}',
        'migration.swipe_reasoning': true,
        'api-storage': false,
    }
    for (const [key, value] of Object.entries(values)) mockValues.set(key, value)
    migrateMMKVKeys(mockStorage)
    expect(Object.fromEntries(mockValues)).toEqual(values)
})

test('MMKV initialization migrates keys before its Zustand storage adapter can hydrate', () => {
    const envelope = { state: { connections: [{ id: 7 }] }, version: 1 }
    mockValues.set('api-storage', JSON.stringify(envelope))
    jest.isolateModules(() => {
        const { createMMKVStorage } = require('../lib/storage/MMKV')
        expect(createMMKVStorage().getItem(Storage.API)).toEqual(envelope)
        expect(mockValues.has('api-storage')).toBe(false)
    })
})
