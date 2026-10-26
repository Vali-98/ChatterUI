import { create } from 'zustand'

// Count queued and running operations so generation cannot start between model transitions.
export const useLocalModelResourceState = create<{ operations: number }>(() => ({ operations: 0 }))

let previousOperation: Promise<void> = Promise.resolve()

// Serialize native allocations/releases to limit peak memory, even though the library supports
// multiple contexts. A rejected operation must not prevent later operations from running.
export const runLocalModelOperation = <T>(run: () => Promise<T>): Promise<T> => {
    useLocalModelResourceState.setState((state) => ({ operations: state.operations + 1 }))
    const done = previousOperation.then(run).finally(() => {
        useLocalModelResourceState.setState((state) => ({ operations: state.operations - 1 }))
    })
    previousOperation = done.then(
        () => undefined,
        () => undefined
    )
    return done
}
