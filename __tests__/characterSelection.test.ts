import { addDatabaseChangeListener, type DatabaseChangeEvent } from 'expo-sqlite'

import { Storage } from '../lib/constants/storageKeys'
import { useCharacterState } from '../lib/state/characters/state'
import { useUserStore } from '../lib/state/characters/store'
import type { CharacterCard } from '../lib/state/characters/types'

jest.mock('expo-sqlite', () => ({ addDatabaseChangeListener: jest.fn() }))
jest.mock('../db/db', () => ({ sqliteDB: { databasePath: '/db.db' } }))
jest.mock('../lib/state/Logger', () => ({ Logger: { error: jest.fn() } }))
jest.mock('../lib/state/characters/images', () => ({
    getCardImageUri: (id: number) => `/cards/${id}.png`,
}))
jest.mock('../lib/state/characters/db', () => {
    const { SQLiteSyncRelationalQuery } = require('drizzle-orm/sqlite-core/query-builders/query')
    const records = new Map()
    const read = jest.fn((id: number) => records.get(id))
    return {
        records: records,
        read: read,
        db: {
            live: {
                card: (id: number) =>
                    Object.assign(Object.create(SQLiteSyncRelationalQuery.prototype), {
                        mode: 'first',
                        sync: () => read(id),
                        execute: async () => read(id),
                    }),
            },
        },
    }
})
jest.mock('../lib/storage/MMKV', () => {
    const { createJSONStorage } = require('zustand/middleware')
    const values = new Map()
    return {
        values: values,
        createMMKVStorage: () =>
            createJSONStorage(() => ({
                getItem: (key: string) => values.get(key) ?? null,
                setItem: (key: string, value: string) => {
                    values.set(key, value)
                },
                removeItem: (key: string) => {
                    values.delete(key)
                },
            })),
    }
})

const { records, read } = require('../lib/state/characters/db') as {
    records: Map<number, CharacterCard>
    read: jest.Mock
}
const { values } = require('../lib/storage/MMKV') as { values: Map<string, string> }
const listeners = new Set<(event: DatabaseChangeEvent) => void>()
const emit = (tableName: string, rowId: number) =>
    listeners.forEach((listener) =>
        listener({
            tableName: tableName,
            rowId: rowId,
            databaseFilePath: '/db.db',
            databaseName: 'main',
        })
    )
const card = (id: number, name: string) =>
    ({
        id: id,
        name: name,
        image_id: id + 10,
        background_image: null,
        description: '',
        tags: [],
        links: [],
        alternate_greetings: [],
    }) as unknown as CharacterCard
const flush = async () => {
    await Promise.resolve()
    await Promise.resolve()
}

beforeEach(() => {
    useCharacterState.getState().unloadCard()
    useUserStore.getState().unloadCard()
    records.clear()
    values.clear()
    read.mockClear()
    jest.mocked(addDatabaseChangeListener).mockImplementation((listener) => {
        listeners.add(listener)
        return {
            remove: () => {
                listeners.delete(listener)
            },
        }
    })
    records.set(1, card(1, 'Character'))
    records.set(2, card(2, 'User'))
})
afterEach(async () => {
    useCharacterState.getState().unloadCard()
    useUserStore.getState().unloadCard()
    await flush()
    expect(listeners.size).toBe(0)
})

test('character and user expose the same load API with a single live observer each', async () => {
    expect(useCharacterState.getState().setCard(1)).toBe('Character')
    expect(useUserStore.getState().setCard(2)).toBe('User')
    expect(listeners.size).toBe(2)
    expect(useCharacterState.getState().getImageUri()).toBe('/cards/11.png')
    expect(useUserStore.getState().getImageUri()).toBe('/cards/12.png')
    expect(JSON.parse(values.get(Storage.UserCard)!)).toEqual({ state: { id: 2 }, version: 3 })
    records.set(1, { ...card(1, 'Renamed'), image_id: 123 })
    emit('characters', 1)
    await flush()
    expect(useCharacterState.getState().card?.name).toBe('Renamed')
    expect(useCharacterState.getState().getImageUri()).toBe('/cards/123.png')
})

test('all included relations refresh both snapshots and deletion clears their selection', async () => {
    useCharacterState.getState().setCard(1)
    useUserStore.getState().setCard(2)
    for (const table of ['character_greetings', 'character_tags', 'tags', 'characterLinks']) {
        records.set(1, card(1, table))
        records.set(2, card(2, table))
        emit(table, 999)
        await flush()
        expect(useCharacterState.getState().card?.name).toBe(table)
        expect(useUserStore.getState().card?.name).toBe(table)
    }
    records.delete(2)
    emit('characters', 2)
    await flush()
    expect(useUserStore.getState().id).toBeUndefined()
    expect(useUserStore.getState().card).toBeUndefined()
    expect(useCharacterState.getState().id).toBe(1)
    expect(listeners.size).toBe(1)
})

test('v2 restores only the user ID and loads fresh database data after explicit hydration', async () => {
    values.set(
        Storage.UserCard,
        JSON.stringify({
            version: 2,
            state: { id: 2, card: card(2, 'Stale persisted name') },
        })
    )
    expect(useUserStore.persist.getOptions().skipHydration).toBe(true)
    expect(read).not.toHaveBeenCalled()
    await useUserStore.persist.rehydrate()
    expect(useUserStore.getState().id).toBe(2)
    expect(useUserStore.getState().card?.name).toBe('User')
    expect(JSON.parse(values.get(Storage.UserCard)!)).toEqual({ state: { id: 2 }, version: 3 })
    await useUserStore.persist.rehydrate()
    expect(useUserStore.getState().card?.name).toBe('User')
    expect(listeners.size).toBe(1)
})

test('missing stored users and v1 snapshots clear selection rather than trusting saved cards', async () => {
    values.set(
        Storage.UserCard,
        JSON.stringify({ version: 3, state: { id: 999, card: card(999, 'Deleted') } })
    )
    await useUserStore.persist.rehydrate()
    expect(useUserStore.getState().id).toBeUndefined()
    expect(useUserStore.getState().card).toBeUndefined()
    values.set(
        Storage.UserCard,
        JSON.stringify({ version: 1, state: { id: 2, card: card(2, 'Legacy') } })
    )
    await useUserStore.persist.rehydrate()
    expect(useUserStore.getState().id).toBeUndefined()
    expect(useUserStore.getState().card).toBeUndefined()
    expect(listeners.size).toBe(0)
})

test('reselecting the same ID explicitly refreshes without replacing the database listener', async () => {
    useCharacterState.getState().setCard(1)
    records.set(1, card(1, 'Fresh'))
    const count = jest.mocked(addDatabaseChangeListener).mock.calls.length
    expect(useCharacterState.getState().setCard(1)).toBe('Fresh')
    expect(jest.mocked(addDatabaseChangeListener)).toHaveBeenCalledTimes(count)
    expect(useUserStore.getState().setCard(999)).toBeUndefined()
    expect(useUserStore.getState().id).toBeUndefined()
})

test('selection refresh failures throw without discarding the last good record', async () => {
    useCharacterState.getState().setCard(1)
    read.mockImplementationOnce(() => {
        throw new Error('read failed')
    })
    expect(() => useCharacterState.getState().setCard(1)).toThrow('read failed')
    expect(useCharacterState.getState().card?.name).toBe('Character')
    expect(useCharacterState.getState().id).toBe(1)
    emit('characters', 1)
    await flush()
    expect(useCharacterState.getState().error).toBeUndefined()
})
