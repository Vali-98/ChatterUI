export type LiveQuerySnapshot<T> = {
    data: T | undefined
    error: Error | undefined
    // Initial async load only; invalidations retain the last successful data.
    isLoading: boolean
    // Last published successful result, not every database invalidation.
    updatedAt: Date | undefined
}

export type QueryKeyValue = string | number | boolean | null | undefined | readonly QueryKeyValue[]
export type QueryKey = readonly QueryKeyValue[]

export const encodeQueryKey = (value: QueryKeyValue): unknown =>
    Array.isArray(value) ? ['array', value.map(encodeQueryKey)] : [typeof value, value]

// SQLite results contain scalars, records, arrays, dates and binary values.
export const equalQueryData = (a: unknown, b: unknown): boolean => {
    if (Object.is(a, b)) return true
    if (!a || !b || typeof a !== 'object' || typeof b !== 'object') return false
    if (a instanceof Date || b instanceof Date) {
        return a instanceof Date && b instanceof Date && a.getTime() === b.getTime()
    }
    if (a instanceof Uint8Array || b instanceof Uint8Array) {
        return (
            a instanceof Uint8Array &&
            b instanceof Uint8Array &&
            a.length === b.length &&
            a.every((value, index) => value === b[index])
        )
    }
    if (Array.isArray(a) !== Array.isArray(b)) return false
    const left = a as Record<string, unknown>
    const right = b as Record<string, unknown>
    const keys = Object.keys(left)
    return (
        keys.length === Object.keys(right).length &&
        keys.every((key) => Object.hasOwn(right, key) && equalQueryData(left[key], right[key]))
    )
}

export const createQueryObserver = <T>({
    read,
    mode,
    enabled,
    initialData,
    equals = equalQueryData,
    listen,
}: {
    read: () => T | PromiseLike<T>
    mode: 'sync' | 'async'
    enabled: boolean
    initialData?: T
    equals?: (previous: T | undefined, next: T | undefined) => boolean
    listen: (invalidate: () => void) => () => void
}) => {
    let snapshot: LiveQuerySnapshot<T> = {
        data: initialData,
        error: undefined,
        isLoading: enabled && mode === 'async',
        updatedAt: undefined,
    }
    const subscribers = new Set<() => void>()
    let stopListening: (() => void) | undefined
    let generation = 0

    const publish = (next: LiveQuerySnapshot<T>) => {
        snapshot = next
        subscribers.forEach((notify) => notify())
    }
    const success = (data: T) => {
        if (
            snapshot.updatedAt !== undefined &&
            !snapshot.error &&
            !snapshot.isLoading &&
            equals(snapshot.data, data)
        )
            return
        publish({ data: data, error: undefined, isLoading: false, updatedAt: new Date() })
    }
    const failure = (cause: unknown) => {
        const error = cause instanceof Error ? cause : new Error(String(cause))
        publish({ ...snapshot, error: error, isLoading: false })
    }
    const refresh = () => {
        const request = ++generation
        try {
            const result = read()
            if (mode === 'sync') {
                success(result as T)
            } else {
                Promise.resolve(result).then(
                    (data) => {
                        if (request === generation) success(data)
                    },
                    (error: unknown) => {
                        if (request === generation) failure(error)
                    }
                )
            }
        } catch (error) {
            if (request === generation) failure(error)
        }
    }

    if (enabled && mode === 'sync') refresh()

    return {
        refresh: refresh,
        // A committed local write can synchronously advance snapshots before an overlay is released.
        refreshSync: (readCommitted: () => T) => {
            ++generation
            try {
                success(readCommitted())
            } catch (error) {
                failure(error)
                throw error
            }
        },
        getSnapshot: () => snapshot,
        subscribe: (notify: () => void) => {
            subscribers.add(notify)
            if (enabled && subscribers.size === 1) {
                stopListening = listen(refresh)
                // Close the gap between the render read and subscribing to database changes.
                refresh()
            }
            return () => {
                subscribers.delete(notify)
                if (subscribers.size === 0) {
                    stopListening?.()
                    stopListening = undefined
                    ++generation
                }
            }
        },
    }
}
