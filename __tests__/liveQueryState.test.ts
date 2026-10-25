import { eq } from 'drizzle-orm'
import { drizzle } from 'drizzle-orm/expo-sqlite'
import { integer, sqliteTable, text } from 'drizzle-orm/sqlite-core'
import {
    addDatabaseChangeListener,
    type DatabaseChangeEvent,
    type SQLiteDatabase,
} from 'expo-sqlite'
import { create } from 'zustand'

import { createLiveQueryState } from '../lib/state/createLiveQueryState'

jest.mock('expo-sqlite', () => ({ addDatabaseChangeListener: jest.fn() }))
jest.mock('../db/db', () => ({ sqliteDB: { databasePath: '/db.db' } }))

const items = sqliteTable('items', { id: integer('id').primaryKey(), name: text('name').notNull() })
const queryDb = drizzle({} as SQLiteDatabase, { schema: { items } })
type Row = typeof items.$inferSelect
type Selection = { id?: number; data?: Row; error?: Error }
const listeners = new Set<(event: DatabaseChangeEvent) => void>()
const emit = (tableName: string, rowId: number, databaseFilePath = '/db.db') => {
    listeners.forEach((listener) =>
        listener({
            tableName: tableName,
            rowId: rowId,
            databaseFilePath: databaseFilePath,
            databaseName: 'main',
        })
    )
}
const flush = async () => {
    await Promise.resolve()
    await Promise.resolve()
}

beforeEach(() => {
    listeners.clear()
    jest.mocked(addDatabaseChangeListener).mockImplementation((listener) => {
        listeners.add(listener)
        return {
            remove: () => {
                listeners.delete(listener)
            },
        }
    })
})
afterEach(() => jest.restoreAllMocks())

const setup = () => {
    const rows = new Map<number, Row>([
        [1, { id: 1, name: 'Alice' }],
        [2, { id: 2, name: 'Bob' }],
    ])
    const state = create<Selection>()(() => ({}))
    const read = jest.fn((id: number): Row | undefined => rows.get(id))
    const binding = createLiveQueryState(state, {
        select: (value) => value.id,
        query: (id) => {
            const query = queryDb.query.items.findFirst({ where: eq(items.id, id) })
            jest.spyOn(query, 'sync').mockImplementation(() => read(id))
            return query
        },
        watch: (id) => [{ table: 'characters', rowId: id }, { table: 'tags' }],
        update: (snapshot, id) =>
            state.setState({
                id: snapshot?.error || snapshot?.data ? id : undefined,
                data: snapshot?.data,
                error: snapshot?.error,
            }),
    })
    return { state, binding, rows, read }
}

test('one database listener serves any number of Zustand consumers', async () => {
    const { state, binding, rows, read } = setup()
    expect(listeners.size).toBe(0)
    const consumers = Array.from({ length: 100 }, () => state.subscribe(jest.fn()))
    state.setState({ id: 1 })
    expect(state.getState().data?.name).toBe('Alice')
    expect(listeners.size).toBe(1)
    const count = read.mock.calls.length
    rows.set(1, { id: 1, name: 'Updated' })
    emit('characters', 1)
    emit('characters', 1)
    emit('tags', 99)
    await flush()
    expect(read).toHaveBeenCalledTimes(count + 1)
    expect(state.getState().data?.name).toBe('Updated')
    consumers.forEach((unsubscribe) => unsubscribe())
    expect(listeners.size).toBe(1)
    binding.dispose()
    expect(listeners.size).toBe(0)
})

test('unchanged results do not publish a new state or record reference', async () => {
    const { state, binding, rows } = setup()
    state.setState({ id: 1 })
    const record = state.getState().data
    const notify = jest.fn()
    const unsubscribe = state.subscribe(notify)
    rows.set(1, { id: 1, name: 'Alice' })
    emit('characters', 1)
    await flush()
    expect(notify).not.toHaveBeenCalled()
    expect(state.getState().data).toBe(record)
    unsubscribe()
    binding.dispose()
})

test('switching IDs cancels queued work for the old record and replaces its listener', async () => {
    const { state, binding, rows, read } = setup()
    state.setState({ id: 1 })
    emit('characters', 1)
    state.setState({ id: 2 })
    const count = read.mock.calls.length
    rows.set(1, { id: 1, name: 'Obsolete' })
    await flush()
    expect(read).toHaveBeenCalledTimes(count)
    expect(state.getState().data?.name).toBe('Bob')
    expect(listeners.size).toBe(1)
    emit('characters', 1)
    emit('characters', 2, '/different.db')
    await flush()
    expect(read).toHaveBeenCalledTimes(count)
    binding.dispose()
})

test('related-table updates refresh the selected record without treating rowids as foreign keys', async () => {
    const { state, binding, rows } = setup()
    state.setState({ id: 1 })
    rows.set(1, { id: 1, name: 'Related data changed' })
    emit('tags', 999)
    await flush()
    expect(state.getState().data?.name).toBe('Related data changed')
    binding.dispose()
})

test('deletion clears selection and detaches its listener; missing selections behave identically', async () => {
    const { state, binding, rows } = setup()
    state.setState({ id: 1 })
    rows.delete(1)
    emit('characters', 1)
    await flush()
    expect(state.getState()).toMatchObject({ id: undefined, data: undefined })
    expect(listeners.size).toBe(0)
    state.setState({ id: 999 })
    expect(state.getState()).toMatchObject({ id: undefined, data: undefined })
    expect(listeners.size).toBe(0)
    binding.dispose()
})

test('refresh is immediate, failures keep the last good record, and later events recover', async () => {
    const { state, binding, rows, read } = setup()
    state.setState({ id: 1 })
    read.mockImplementationOnce(() => {
        throw new Error('read failed')
    })
    binding.refresh()
    expect(state.getState().error?.message).toBe('read failed')
    expect(state.getState().data?.name).toBe('Alice')
    rows.set(1, { id: 1, name: 'Recovered' })
    emit('characters', 1)
    await flush()
    expect(state.getState().error).toBeUndefined()
    expect(state.getState().data?.name).toBe('Recovered')
    binding.dispose()
})

test('dispose cancels pending notifications and future selection changes', async () => {
    const { state, binding, read } = setup()
    state.setState({ id: 1 })
    emit('characters', 1)
    const count = read.mock.calls.length
    binding.dispose()
    state.setState({ id: 2 })
    await flush()
    expect(read).toHaveBeenCalledTimes(count)
    expect(listeners.size).toBe(0)
})
