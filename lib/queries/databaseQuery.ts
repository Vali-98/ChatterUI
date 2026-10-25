import { is } from 'drizzle-orm'
import type { AnySQLiteSelect } from 'drizzle-orm/sqlite-core'
import { SQLiteSyncRelationalQuery } from 'drizzle-orm/sqlite-core/query-builders/query'
import { addDatabaseChangeListener } from 'expo-sqlite'

import { sqliteDB, type TableNames } from '@db/db'

import { createQueryObserver, type LiveQuerySnapshot, type QueryKey } from './queryObserver'

export type LiveQueryWatch = {
    table: TableNames
    // SQLite rowid, usually the integer primary key; not a foreign key.
    // Omit to watch all rows. An empty array watches no rows.
    rowId?: number | readonly number[]
}

export type LiveQueryOptions<T> = {
    // Include every query input (and custom equality/initial-data behavior).
    key: QueryKey
    watch: readonly LiveQueryWatch[]
    enabled?: boolean
    // Async reads retain previous data by default; set false to clear on key changes.
    keepPreviousData?: boolean
    initialData?: T
    equals?: (previous: T | undefined, next: T | undefined) => boolean
}

export type DatabaseQueryOptions<T> = Pick<
    LiveQueryOptions<T>,
    'watch' | 'enabled' | 'initialData' | 'equals'
>

export type LiveQuery =
    | (Pick<AnySQLiteSelect, '_' | 'then' | 'all'> & { _: { resultType: 'sync' } })
    | SQLiteSyncRelationalQuery<unknown>
export type QuerySnapshot<T> = Omit<LiveQuerySnapshot<T>, 'data'> & { data: T }

// Drizzle's own Expo live hook uses this discriminator too; keep the internal access here.
export const getQueryInitialData = <Q extends LiveQuery>(query: Q): Awaited<Q> =>
    (is(query, SQLiteSyncRelationalQuery) &&
    (query as unknown as { mode: 'first' | 'many' }).mode === 'first'
        ? undefined
        : []) as Awaited<Q>

export const createDatabaseQueryObserver = <Q extends LiveQuery>(
    query: Q,
    {
        watch,
        enabled = true,
        initialData = getQueryInitialData(query),
        equals,
    }: DatabaseQueryOptions<Awaited<Q>>,
    mode: 'sync' | 'async' = 'sync'
) => {
    type Data = Awaited<Q>
    const read = (): Data | PromiseLike<Data> => {
        if (mode === 'async') return query as PromiseLike<Data>
        return (is(query, SQLiteSyncRelationalQuery) ? query.sync() : query.all()) as Data
    }
    const listen = (invalidate: () => void) => {
        let active = true
        let pending = false
        const listener = addDatabaseChangeListener((event) => {
            if (event.databaseFilePath !== sqliteDB.databasePath) return
            if (
                !watch.some(
                    ({ table, rowId }) =>
                        table === event.tableName &&
                        (rowId === undefined ||
                            (typeof rowId === 'number'
                                ? rowId === event.rowId
                                : rowId.includes(event.rowId)))
                )
            )
                return
            // Collapse notification bursts, without scheduling work for every UI subscriber.
            if (pending) return
            pending = true
            queueMicrotask(() => {
                pending = false
                if (active) invalidate()
            })
        })
        return () => {
            active = false
            listener.remove()
        }
    }
    const observer = createQueryObserver({ read, mode, enabled, initialData, equals, listen })
    return {
        ...observer,
        getSnapshot: () => observer.getSnapshot() as QuerySnapshot<Data>,
    }
}
