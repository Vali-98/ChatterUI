import { useState, useSyncExternalStore } from 'react'

import {
    createDatabaseQueryObserver,
    getQueryInitialData,
    type LiveQuery,
    type LiveQueryOptions,
} from '@lib/queries/databaseQuery'
import { encodeQueryKey } from '@lib/queries/queryObserver'

export type { LiveQueryOptions, LiveQueryWatch } from '@lib/queries/databaseQuery'

const useLiveQuery = <Q extends LiveQuery>(
    query: Q,
    options: LiveQueryOptions<Awaited<Q>>,
    mode: 'sync' | 'async'
) => {
    const { key, watch, enabled = true, keepPreviousData = mode === 'async' } = options
    const defaultData =
        options.initialData === undefined ? getQueryInitialData(query) : options.initialData
    // Inline query/options objects are supported. Every query input belongs in key.
    const identity = JSON.stringify([encodeQueryKey(key), watch, enabled, mode, keepPreviousData])
    const buildCurrent = (initialData = defaultData) => {
        const observer = createDatabaseQueryObserver(
            query,
            { ...options, initialData: initialData },
            mode
        )
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
    return useSyncExternalStore(observer.subscribe, observer.getSnapshot, observer.getSnapshot)
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
