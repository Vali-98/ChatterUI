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

type CommittedObserver = { watch: readonly LiveQueryWatch[]; refresh: () => void }
const committedObservers = new Set<CommittedObserver>()
const watchesChanges = (watch: readonly LiveQueryWatch[], changes: readonly LiveQueryWatch[]) =>
    watch.some((watched) =>
        changes.some((change) => {
            if (watched.table !== change.table) return false
            if (
                (Array.isArray(watched.rowId) && watched.rowId.length === 0) ||
                (Array.isArray(change.rowId) && change.rowId.length === 0)
            )
                return false
            if (watched.rowId === undefined || change.rowId === undefined) return true
            const rows = typeof watched.rowId === 'number' ? [watched.rowId] : watched.rowId
            const changedRows = typeof change.rowId === 'number' ? [change.rowId] : change.rowId
            return rows.some((row) => changedRows.includes(row))
        })
    )

/** Publish committed SQLite rows before releasing transient state that covers older snapshots. */
export const publishDatabaseChanges = (changes: readonly LiveQueryWatch[]) => {
    for (const observer of [...committedObservers])
        if (watchesChanges(observer.watch, changes)) observer.refresh()
}

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
    const readSync = (): Data =>
        (is(query, SQLiteSyncRelationalQuery) ? query.sync() : query.all()) as Data
    const read = (): Data | PromiseLike<Data> => {
        if (mode === 'async') return query as PromiseLike<Data>
        return readSync()
    }
    const listen = (invalidate: () => void) => {
        const committed = { watch: watch, refresh: () => observer.refreshSync(readSync) }
        committedObservers.add(committed)
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
            committedObservers.delete(committed)
            listener.remove()
        }
    }
    const observer = createQueryObserver({ read, mode, enabled, initialData, equals, listen })
    return {
        ...observer,
        getSnapshot: () => observer.getSnapshot() as QuerySnapshot<Data>,
    }
}
