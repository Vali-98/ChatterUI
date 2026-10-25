import type { StoreApi } from 'zustand'

import {
    createDatabaseQueryObserver,
    type LiveQuery,
    type LiveQueryWatch,
    type QuerySnapshot,
} from '@lib/queries/databaseQuery'

export type LiveQueryStateBinding = {
    refresh: () => void
    dispose: () => void
}

/** Bind one query to shared Zustand state, independently of React component subscriptions. */
export const createLiveQueryState = <S, Q extends LiveQuery>(
    state: StoreApi<S>,
    {
        select,
        query,
        watch,
        update,
    }: {
        select: (state: S) => number | undefined
        query: (id: number) => Q
        watch: (id: number) => readonly LiveQueryWatch[]
        update: (snapshot: QuerySnapshot<Awaited<Q>> | undefined, id: number | undefined) => void
    }
): LiveQueryStateBinding => {
    let selected: number | undefined
    let observer: ReturnType<typeof createDatabaseQueryObserver<Q>> | undefined
    let unsubscribe: (() => void) | undefined
    let lastSnapshot: QuerySnapshot<Awaited<Q>> | undefined
    let disposed = false

    const publish = () => {
        const snapshot = observer?.getSnapshot()
        if (snapshot === lastSnapshot) return
        lastSnapshot = snapshot
        update(snapshot, selected)
    }
    const connect = () => {
        const id = select(state.getState())
        if (disposed || id === selected) return
        unsubscribe?.()
        unsubscribe = undefined
        observer = undefined
        lastSnapshot = undefined
        selected = id
        if (id === undefined) {
            update(undefined, undefined)
            return
        }
        observer = createDatabaseQueryObserver(query(id), { watch: watch(id) })
        let attaching = true
        unsubscribe = observer.subscribe(() => {
            if (!attaching) publish()
        })
        attaching = false
        publish()
    }
    const unsubscribeState = state.subscribe(connect)
    connect()
    return {
        refresh: () => {
            if (disposed) return
            observer?.refresh()
            publish()
        },
        dispose: () => {
            disposed = true
            unsubscribeState()
            unsubscribe?.()
            unsubscribe = undefined
            observer = undefined
        },
    }
}
