import { is, SQL, Subquery } from 'drizzle-orm'
import {
    AnySQLiteSelect,
    getTableConfig,
    getViewConfig,
    SQLiteTable,
    SQLiteView,
} from 'drizzle-orm/sqlite-core'
import { SQLiteRelationalQuery } from 'drizzle-orm/sqlite-core/query-builders/query'
import { addDatabaseChangeListener } from 'expo-sqlite'
import { useEffect, useRef, useState } from 'react'

import { TableNames } from '@db/db'

type Task<T> = (() => Promise<T>) | (() => T)

class QueryQueue {
    private running = 0
    private queue: (() => void)[] = []

    constructor(private concurrency = 4) {}

    async add<T>(task: Task<T>): Promise<T> {
        if (this.running >= this.concurrency) {
            await new Promise<void>((resolve) => {
                this.queue.push(resolve)
            })
        }

        this.running++

        try {
            return await task()
        } finally {
            this.running--

            const next = this.queue.shift()
            next?.()
        }
    }
}

export const dbQueryQueue = new QueryQueue(4)

const getJoinedTableNames = (query: any) => {
    if (query.config.with) {
        return Object.keys(query.config.with).map(
            (relation) => query.tableConfig.relations[relation].referencedTableName
        )
    } else if (query.config.joins) {
        return query.config.joins.map((join: any) => join.table[Symbol.for('drizzle:BaseName')])
    } else {
        return []
    }
}

const isDeepEqual = (a: any, b: any): boolean => {
    if (a === b) return true
    if (typeof a !== 'object' || Object.is(a, null) || typeof b !== 'object' || Object.is(b, null))
        return false

    const keysA = Object.keys(a)
    const keysB = Object.keys(b)
    if (keysA.length !== keysB.length) return false

    for (const key of keysA) {
        if (!keysB.includes(key) || !isDeepEqual(a[key], b[key])) return false
    }
    return true
}

export const useQueuedLiveQuery = <
    T extends Pick<AnySQLiteSelect, '_' | 'then'> | SQLiteRelationalQuery<'sync', any>,
>(
    query: T,
    deps: unknown[] = [],
    options?: {
        enabled?: boolean
        targets?: { tableName: TableNames; rowId: number | number[] }[]
        deepCheck?: boolean
        sync?: boolean
    }
) => {
    const data = useRef<Awaited<T>>(
        //@ts-expect-error
        options?.sync && query.sync
            ? //@ts-expect-error sync not found
              query.sync()
            : //@ts-expect-error
              ((is(query, SQLiteRelationalQuery) && query.mode === 'first'
                  ? undefined
                  : []) as Awaited<T>)
    )

    const [error, setError] = useState<Error>()
    const [updatedAt, setUpdatedAt] = useState<Date>()

    useEffect(() => {
        if (options?.enabled === false) return

        const entity = is(query, SQLiteRelationalQuery)
            ? //@ts-expect-error
              query.table
            : //@ts-expect-error
              (query as AnySQLiteSelect).config.table

        if (is(entity, Subquery) || is(entity, SQL)) {
            // eslint-disable-next-line react-hooks/set-state-in-effect
            setError(
                new Error('Selecting from subqueries and SQL are not supported in useLiveQuery')
            )
            return
        }

        let cancelled = false
        let listener: ReturnType<typeof addDatabaseChangeListener> | undefined

        const runQuery = async () => {
            try {
                const result = (await dbQueryQueue.add(() => query as any)) as any

                if (cancelled) return
                if (options?.deepCheck && isDeepEqual(data.current, result)) {
                    return
                }
                data.current = result
                setUpdatedAt(new Date())
            } catch (err) {
                if (!cancelled) {
                    setError(err as Error)
                }
            }
        }

        runQuery()

        if (is(entity, SQLiteTable) || is(entity, SQLiteView)) {
            const config = is(entity, SQLiteTable) ? getTableConfig(entity) : getViewConfig(entity)

            const relationTableNames = getJoinedTableNames(query)

            const listeningTables = [config.name, ...relationTableNames]
            const targets = options?.targets
            listener = addDatabaseChangeListener(({ tableName, rowId }) => {
                const isListening = listeningTables.includes(tableName)
                const isTargetMatch =
                    targets &&
                    targets.some(
                        (t) =>
                            t.tableName === tableName &&
                            (Array.isArray(t.rowId) ? t.rowId.includes(rowId) : t.rowId === rowId)
                    )

                if (isTargetMatch || (!targets && isListening)) {
                    runQuery()
                }
            })
        }

        return () => {
            cancelled = true
            listener?.remove()
        }
    }, [options?.enabled, query, deps, options])

    return {
        // eslint-disable-next-line react-hooks/refs, react-compiler/react-compiler
        data: data.current,
        error: error,
        updatedAt: updatedAt,
    } as const
}
