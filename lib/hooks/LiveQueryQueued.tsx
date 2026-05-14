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
import { useEffect, useState } from 'react'

type Task<T> = () => Promise<T>

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

export const useQueuedLiveQuery = <
    T extends Pick<AnySQLiteSelect, '_' | 'then'> | SQLiteRelationalQuery<'sync', any>,
>(
    query: T,
    deps: unknown[] = [],
    options?: {
        enabled?: boolean
    }
) => {
    const [data, setData] = useState<Awaited<T>>(
        //@ts-expect-error
        (is(query, SQLiteRelationalQuery) && query.mode === 'first' ? undefined : []) as Awaited<T>
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

                setData(result)
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

            listener = addDatabaseChangeListener(({ tableName }) => {
                if (listeningTables.includes(tableName)) {
                    runQuery()
                }
            })
        }

        return () => {
            cancelled = true
            listener?.remove()
        }
    }, [options?.enabled, query, deps])

    return {
        data,
        error,
        updatedAt,
    } as const
}
