import { is } from 'drizzle-orm'
import type { AnySQLiteSelect } from 'drizzle-orm/sqlite-core'
import { SQLiteSyncRelationalQuery } from 'drizzle-orm/sqlite-core/query-builders/query'
import { addDatabaseChangeListener } from 'expo-sqlite'
import { useState, useSyncExternalStore } from 'react'

import { sqliteDB, type TableNames } from '@db/db'

import {
    createQueryObserver,
    encodeQueryKey,
    type QueryKey,
    type LiveQuerySnapshot,
} from './queryObserver'

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

type LiveQuery =
    | (Pick<AnySQLiteSelect, '_' | 'then' | 'all'> & { _: { resultType: 'sync' } })
    | SQLiteSyncRelationalQuery<unknown>
type QuerySnapshot<T> = Omit<LiveQuerySnapshot<T>, 'data'> & { data: T }

// Drizzle's own Expo live hook uses this discriminator too; keep the internal access here.
const isFirstQuery = (query: LiveQuery) =>
    is(query, SQLiteSyncRelationalQuery) &&
    (query as unknown as { mode: 'first' | 'many' }).mode === 'first'

const useLiveQuery = <Q extends LiveQuery>(
    query: Q,
    options: LiveQueryOptions<Awaited<Q>>,
    mode: 'sync' | 'async'
) => {
    type Data = Awaited<Q>
    const {
        key,
        watch,
        enabled = true,
        initialData,
        equals,
        keepPreviousData = mode === 'async',
    } = options
    const defaultData =
        initialData === undefined ? ((isFirstQuery(query) ? undefined : []) as Data) : initialData
    // Inline query/options objects are supported. Every query input belongs in key.
    const identity = JSON.stringify([encodeQueryKey(key), watch, enabled, mode, keepPreviousData])
    const listen = (invalidate: () => void) => {
        const subscription = addDatabaseChangeListener((event) => {
            if (event.databaseFilePath !== sqliteDB.databasePath) return
            if (
                watch.some(
                    ({ table, rowId }) =>
                        table === event.tableName &&
                        (rowId === undefined ||
                            (typeof rowId === 'number'
                                ? rowId === event.rowId
                                : rowId.includes(event.rowId)))
                )
            ) {
                invalidate()
            }
        })
        return () => subscription.remove()
    }
    const buildCurrent = (initialData = defaultData) => {
        const read = (): Data | PromiseLike<Data> => {
            if (mode === 'async') return query as PromiseLike<Data>
            return (is(query, SQLiteSyncRelationalQuery) ? query.sync() : query.all()) as Data
        }
        const observer = createQueryObserver({ read, mode, enabled, initialData, equals, listen })
        return { identity, observer }
    }
    const [current, setCurrent] = useState(() => buildCurrent())
    let active = current
    if (current.identity !== identity) {
        // Replace during render, applying the requested previous-data policy.
        active = buildCurrent(
            keepPreviousData && enabled ? current.observer.getSnapshot().data : defaultData
        )
        setCurrent(active)
    }
    const { observer } = active
    return useSyncExternalStore(
        observer.subscribe,
        observer.getSnapshot,
        observer.getSnapshot
    ) as QuerySnapshot<Data>
}

/** For bounded local reads; the hook executes the Drizzle query synchronously. */
export const useLiveQuerySync = <Q extends LiveQuery>(
    query: Q,
    options: LiveQueryOptions<Awaited<Q>>
) => useLiveQuery(query, options, 'sync')

/** List queries start with []; findFirst starts with undefined. Previous data is retained. */
export const useLiveQueryAsync = <Q extends LiveQuery>(
    query: Q,
    options: LiveQueryOptions<Awaited<Q>>
) => useLiveQuery(query, options, 'async')
