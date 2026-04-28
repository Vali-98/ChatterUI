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

export const useLiveQueryJoined = <
    T extends Pick<AnySQLiteSelect, '_' | 'then'> | SQLiteRelationalQuery<'sync', unknown>,
>(
    query: T,
    deps: unknown[] = []
) => {
    const [data, setData] = useState<Awaited<T>>(
        //@ts-expect-error
        (is(query, SQLiteRelationalQuery) && query.mode === 'first' ? undefined : []) as Awaited<T>
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
            setError(
                new Error('Selecting from subqueries and SQL are not supported in useLiveQuery')
            )
            return
        }

        let listener: ReturnType<typeof addDatabaseChangeListener> | undefined

        const handleData = (data: any) => {
            setData(data)
            setUpdatedAt(new Date())
        }

        query.then(handleData).catch(setError)

        if (is(entity, SQLiteTable) || is(entity, SQLiteView)) {
            const config = is(entity, SQLiteTable) ? getTableConfig(entity) : getViewConfig(entity)
            const relationTableNames = getJoinedTableNames(query)
            const listeningTables = [config.name, ...relationTableNames]
            listener = addDatabaseChangeListener(({ tableName }) => {
                if (listeningTables.includes(tableName)) {
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
        data,
        error,
        updatedAt,
    } as const
}
