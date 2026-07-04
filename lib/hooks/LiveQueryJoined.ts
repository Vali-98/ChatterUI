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

export const useLiveQueryJoined = <
    T extends Pick<AnySQLiteSelect, '_' | 'then'> | SQLiteRelationalQuery<'sync', unknown>,
>(
    query: T,
    deps: unknown[] = [],
    options: {
        targets?: { tableName: TableNames; rowId: number }[]
        ignore?: TableNames[]
        deepCheck?: boolean
        onUpdated?: (result: Awaited<T>) => void
        sync?: boolean
    } = {}
) => {
    const data = useRef<Awaited<T>>(
        //@ts-expect-error
        (options?.sync && query.sync
            ? //@ts-expect-error sync not found
              query.sync()
            : //@ts-expect-error
              is(query, SQLiteRelationalQuery) && query.mode === 'first'
              ? undefined
              : []) as Awaited<T>
    )
    const [error, setError] = useState<Error>()
    const [updatedAt, setUpdatedAt] = useState<Date>()

    useEffect(() => {
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

        let listener: ReturnType<typeof addDatabaseChangeListener> | undefined

        const handleData = (newData: any) => {
            if (options?.deepCheck && isDeepEqual(data.current, newData)) {
                return
            }
            data.current = newData
            options.onUpdated?.(newData)
            setUpdatedAt(new Date())
        }
        query.then(handleData).catch(setError)

        if (is(entity, SQLiteTable) || is(entity, SQLiteView)) {
            const config = is(entity, SQLiteTable) ? getTableConfig(entity) : getViewConfig(entity)
            const relationTableNames = getJoinedTableNames(query)
            const listeningTables = [config.name, ...relationTableNames]
            const targets = options?.targets
            const ignore = options?.ignore
            listener = addDatabaseChangeListener(({ tableName, rowId }) => {
                const isListening = listeningTables.includes(tableName)
                const isTargetMatch =
                    targets &&
                    targets.some(
                        (target) => tableName === target.tableName && target.rowId === rowId
                    )

                if (
                    !ignore?.includes(tableName as TableNames) &&
                    (isTargetMatch || (!targets && isListening))
                ) {
                    query.then(handleData).catch(setError)
                }
            })
        }

        return () => {
            listener?.remove()
        }
        // eslint-disable-next-line react-compiler/react-compiler
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, deps)

    return {
        // eslint-disable-next-line react-hooks/refs
        data: data.current,
        error: error,
        updatedAt: updatedAt,
    } as const
}
