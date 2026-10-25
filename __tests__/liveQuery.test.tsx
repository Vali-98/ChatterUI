import { drizzle } from 'drizzle-orm/expo-sqlite'
import { integer, sqliteTable, text } from 'drizzle-orm/sqlite-core'
import { SQLiteSyncRelationalQuery } from 'drizzle-orm/sqlite-core/query-builders/query'
import {
    addDatabaseChangeListener,
    type DatabaseChangeEvent,
    type SQLiteDatabase,
} from 'expo-sqlite'
import React, { act } from 'react'

import { useLiveQueryAsync, useLiveQuerySync } from '../lib/hooks/liveQuery'

jest.mock('expo-sqlite', () => ({ addDatabaseChangeListener: jest.fn() }))
jest.mock('../db/db', () => ({ sqliteDB: { databasePath: '/db.db' } }))

const { create } = require('react-test-renderer') as {
    create: (element: React.ReactElement) => {
        update: (element: React.ReactElement) => void
        unmount: () => void
    }
}

// Query doubles retain Drizzle's discriminator and execution protocol.
const mockQuery = <T,>(mode: 'first' | 'many', read: () => T | PromiseLike<T>) =>
    Object.assign(Object.create(SQLiteSyncRelationalQuery.prototype), {
        mode: mode,
        sync: read,
        execute: () => Promise.resolve(read()),
    }) as SQLiteSyncRelationalQuery<T>
const firstQuery = <T,>(read: () => T | PromiseLike<T>) => mockQuery<T | undefined>('first', read)
const listQuery = <T,>(read: () => T[] | PromiseLike<T[]>) => mockQuery<T[]>('many', read)

Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true })
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
    // This installed React renderer emits a deprecation notice on each mount.
    const original = console.error
    jest.spyOn(console, 'error').mockImplementation((message, ...args: unknown[]) => {
        if (typeof message === 'string' && message.startsWith('react-test-renderer is deprecated'))
            return
        original(message, ...args)
    })
})
afterEach(() => jest.restoreAllMocks())

test('sync values are present on the first render and inline queries do not restart reads', async () => {
    const reads = jest.fn((id: number) => ({ id: id, name: `Person ${id}` }))
    const seen: (number | undefined)[] = []
    function Probe({ id }: { id: number }) {
        const result = useLiveQuerySync(
            firstQuery(() => reads(id)),
            {
                key: ['identity', id],
                watch: [{ table: 'characters', rowId: id }],
            }
        )
        seen.push(result.data?.id)
        return null
    }
    let root!: ReturnType<typeof create>
    await act(async () => {
        root = create(<Probe id={1} />)
    })
    expect(seen.every((id) => id === 1)).toBe(true)
    const calls = reads.mock.calls.length
    await act(async () => {
        root.update(<Probe id={1} />)
    })
    expect(reads).toHaveBeenCalledTimes(calls)
    seen.length = 0
    await act(async () => {
        root.update(<Probe id={2} />)
    })
    expect(seen.every((id) => id === 2)).toBe(true)
    expect(listeners.size).toBe(1)
    await act(async () => {
        root.unmount()
    })
    expect(listeners.size).toBe(0)
})

test('watch rules filter table, row and database; unchanged data does not rerender', async () => {
    let name = 'Alice'
    let exists = true
    let renders = 0
    let current: string | undefined
    const read = jest.fn(() => (exists ? { name: name } : undefined))
    function Probe() {
        const { data } = useLiveQuerySync(firstQuery(read), {
            key: ['identity', 1],
            watch: [{ table: 'characters', rowId: [1, 2] }, { table: 'tags' }],
        })
        current = data?.name
        renders++
        return null
    }
    let root!: ReturnType<typeof create>
    await act(async () => {
        root = create(<Probe />)
    })
    const calls = read.mock.calls.length
    const initialRenders = renders
    await act(async () => {
        emit('characters', 3)
        emit('chat_swipes', 1)
        emit('characters', 1, '/other.db')
    })
    expect(read).toHaveBeenCalledTimes(calls)
    await act(async () => {
        emit('characters', 2)
    })
    expect(renders).toBe(initialRenders)
    name = 'Bob'
    await act(async () => {
        emit('tags', 99)
    })
    expect(current).toBe('Bob')
    expect(renders).toBe(initialRenders + 1)
    exists = false
    await act(async () => {
        emit('characters', 1)
    })
    expect(current).toBeUndefined()
    expect(renders).toBe(initialRenders + 2)
    await act(async () => {
        root.unmount()
    })
})

test('disabled reads stay empty and enabling or changing an ID reads the correct record', async () => {
    const read = jest.fn((id: number) => id)
    const seen: (number | undefined)[] = []
    function Probe({ id, enabled }: { id: number; enabled: boolean }) {
        const result = useLiveQuerySync(
            firstQuery(() => read(id)),
            {
                key: ['identity', id],
                watch: [{ table: 'characters', rowId: id }],
                enabled: enabled,
            }
        )
        seen.push(result.data)
        return null
    }
    let root!: ReturnType<typeof create>
    await act(async () => {
        root = create(<Probe id={1} enabled={false} />)
    })
    expect(seen.at(-1)).toBeUndefined()
    expect(read).not.toHaveBeenCalled()
    expect(listeners.size).toBe(0)
    await act(async () => {
        root.update(<Probe id={2} enabled />)
    })
    expect(seen.at(-1)).toBe(2)
    await act(async () => {
        root.unmount()
    })
})

test('async ID changes can explicitly clear previous data and ignore outstanding requests', async () => {
    const resolve: Record<number, (value: number) => void> = {}
    const read = (id: number) =>
        new Promise<number>((done) => {
            resolve[id] = done
        })
    const seen: (number | undefined)[] = []
    function Probe({ id }: { id: number }) {
        const result = useLiveQueryAsync(
            firstQuery(() => read(id)),
            {
                key: ['identity', id],
                watch: [{ table: 'characters', rowId: id }],
                keepPreviousData: false,
            }
        )
        seen.push(result.data)
        return null
    }
    let root!: ReturnType<typeof create>
    await act(async () => {
        root = create(<Probe id={1} />)
    })
    await act(async () => {
        resolve[1](1)
    })
    expect(seen.at(-1)).toBe(1)
    await act(async () => {
        root.update(<Probe id={2} />)
    })
    expect(seen.at(-1)).toBeUndefined()
    await act(async () => {
        root.update(<Probe id={3} />)
    })
    await act(async () => {
        resolve[2](2)
    })
    expect(seen.at(-1)).toBeUndefined()
    await act(async () => {
        resolve[3](3)
    })
    expect(seen.at(-1)).toBe(3)
    await act(async () => {
        root.unmount()
    })
})

test('async queries retain previous data by default until the new sort resolves', async () => {
    const resolve: Record<string, (rows: number[]) => void> = {}
    const read = (order: string) =>
        new Promise<number[]>((done) => {
            resolve[order] = done
        })
    const seen: (number[] | undefined)[] = []
    function Probe({ order }: { order: string }) {
        const result = useLiveQueryAsync(
            listQuery(() => read(order)),
            {
                key: ['list', order],
                watch: [{ table: 'characters' }],
            }
        )
        seen.push(result.data)
        return null
    }
    let root!: ReturnType<typeof create>
    await act(async () => {
        root = create(<Probe order="asc" />)
    })
    await act(async () => {
        resolve.asc([1, 2])
    })
    seen.length = 0
    await act(async () => {
        root.update(<Probe order="desc" />)
    })
    expect(seen.length).toBeGreaterThan(0)
    expect(seen.every((rows) => rows?.join() === '1,2')).toBe(true)
    await act(async () => {
        resolve.desc([2, 1])
    })
    expect(seen.at(-1)).toEqual([2, 1])
    expect(seen.every((rows) => rows?.length === 2)).toBe(true)
    await act(async () => {
        root.unmount()
    })
})

const items = sqliteTable('test_items', {
    id: integer('id').primaryKey(),
    name: text('name').notNull(),
})
const queryDb = drizzle({} as SQLiteDatabase, { schema: { items } })

test('real Drizzle findMany/select default to typed arrays; findFirst defaults to undefined', async () => {
    const many = queryDb.query.items.findMany()
    const first = queryDb.query.items.findFirst()
    const select = queryDb.select({ id: items.id }).from(items)
    const pendingMany = new Promise<Awaited<typeof many>>(() => {})
    const pendingFirst = new Promise<Awaited<typeof first>>(() => {})
    const pendingSelect = new Promise<Awaited<typeof select>>(() => {})
    const executeMany = jest.spyOn(many, 'execute').mockReturnValue(pendingMany)
    jest.spyOn(first, 'execute').mockReturnValue(pendingFirst)
    jest.spyOn(select, 'execute').mockReturnValue(pendingSelect)
    const seen: unknown[] = []
    function Probe() {
        const list = useLiveQueryAsync(many, { key: ['many'], watch: [] })
        const record = useLiveQueryAsync(first, { key: ['first'], watch: [] })
        const selection = useLiveQueryAsync(select, { key: ['select'], watch: [] })
        // These calls also verify that list data is not optional in the inferred type.
        seen.push([
            list.data.map((item) => item.id),
            record.data,
            selection.data.map((item) => item.id),
        ])
        return null
    }
    let root!: ReturnType<typeof create>
    await act(async () => {
        root = create(<Probe />)
    })
    expect(
        seen.every((value) => JSON.stringify(value) === JSON.stringify([[], undefined, []]))
    ).toBe(true)
    expect(executeMany).toHaveBeenCalledTimes(1)
    await act(async () => {
        root.unmount()
    })
})

test('disabled or failed list queries keep a stable typed empty array', async () => {
    const query = queryDb.query.items.findMany()
    jest.spyOn(query, 'execute').mockRejectedValue(new Error('read failed'))
    const snapshots: ReturnType<typeof useLiveQueryAsync<typeof query>>[] = []
    const latest = () => snapshots.at(-1)
    function Probe({ enabled }: { enabled: boolean }) {
        const result = useLiveQueryAsync(query, { key: ['many'], watch: [], enabled: enabled })
        result.data.map((item) => item.id)
        snapshots.push(result)
        return null
    }
    let root!: ReturnType<typeof create>
    await act(async () => {
        root = create(<Probe enabled={false} />)
    })
    expect(latest()?.data).toEqual([])
    expect(query.execute).not.toHaveBeenCalled()
    const empty = latest()?.data
    await act(async () => {
        root.update(<Probe enabled={false} />)
    })
    expect(latest()?.data).toBe(empty)
    await act(async () => {
        root.update(<Probe enabled />)
    })
    expect(latest()?.data).toEqual([])
    expect(latest()?.error?.message).toBe('read failed')
    await act(async () => {
        root.unmount()
    })
})

test('sync queries execute relational .sync() and select .all() without caller wrappers', async () => {
    const many = queryDb.query.items.findMany()
    const first = queryDb.query.items.findFirst()
    const select = queryDb.select({ id: items.id }).from(items)
    jest.spyOn(many, 'sync').mockReturnValue([{ id: 1, name: 'Alice' }])
    jest.spyOn(first, 'sync').mockReturnValue({ id: 1, name: 'Alice' })
    jest.spyOn(select, 'all').mockReturnValue([{ id: 1 }])
    const seen: unknown[] = []
    function Probe() {
        const list = useLiveQuerySync(many, { key: ['many'], watch: [] })
        const record = useLiveQuerySync(first, { key: ['first'], watch: [] })
        const selection = useLiveQuerySync(select, { key: ['select'], watch: [] })
        seen.push([
            list.data.map((item) => item.id),
            record.data?.name,
            selection.data.map((item) => item.id),
        ])
        return null
    }
    let root!: ReturnType<typeof create>
    await act(async () => {
        root = create(<Probe />)
    })
    expect(
        seen.every((value) => JSON.stringify(value) === JSON.stringify([[1], 'Alice', [1]]))
    ).toBe(true)
    await act(async () => {
        root.unmount()
    })
})
