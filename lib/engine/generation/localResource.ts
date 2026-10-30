import { create } from 'zustand'

type LocalModelActivity = {
    kind: 'loading' | 'unloading' | 'projector'
    name: string
    progress?: number
    error?: string
}

// Count queued and running operations so generation cannot start between model transitions.
export const useLocalModelResourceState = create<{
    operations: number
    activity?: LocalModelActivity
    dismissNotice: () => void
}>((set) => ({ operations: 0, dismissNotice: () => set({ activity: undefined }) }))

export const startLocalModelActivity = (activity: LocalModelActivity) =>
    useLocalModelResourceState.setState({ activity })

export const failLocalModelActivity = (error: unknown) =>
    useLocalModelResourceState.setState((state) =>
        state.activity
            ? {
                  activity: {
                      ...state.activity,
                      error: String(error instanceof Error ? error.message : error),
                  },
              }
            : state
    )

let previousOperation: Promise<void> = Promise.resolve()

// Serialize native allocations/releases to limit peak memory, even though the library supports
// multiple contexts. A rejected operation must not prevent later operations from running.
export const runLocalModelOperation = <T>(run: () => Promise<T>): Promise<T> => {
    useLocalModelResourceState.setState((state) => ({ operations: state.operations + 1 }))
    const done = previousOperation.then(async () => {
        if (useLocalModelResourceState.getState().activity)
            useLocalModelResourceState.setState({ activity: undefined })
        try {
            return await run()
        } catch (error) {
            failLocalModelActivity(error)
            throw error
        } finally {
            useLocalModelResourceState.setState((state) => ({
                operations: state.operations - 1,
                activity: state.activity?.error !== undefined ? state.activity : undefined,
            }))
        }
    })
    previousOperation = done.then(
        () => undefined,
        () => undefined
    )
    return done
}
