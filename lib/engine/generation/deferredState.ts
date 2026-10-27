import { create } from 'zustand'

export type DeferredTaskStatus =
    | 'pending'
    | 'running'
    | 'cancelling'
    | 'completed'
    | 'cancelled'
    | 'failed'
    | 'timed_out'
export type DeferredTask = {
    id: number
    parentGenerationId?: number
    resourceId?: number
    chatId: number
    kind: 'title' | 'summary'
    mode: 'local' | 'remote'
    status: DeferredTaskStatus
    createdAt: number
    startedAt?: number
    finishedAt?: number
    error?: string
}
export const useDeferredTaskState = create<{ tasks: Record<number, DeferredTask> }>(() => ({
    tasks: {},
}))
export const isDeferredTaskRunning = (task: DeferredTask) =>
    task.status === 'running' || task.status === 'cancelling'
export const isDeferredTaskActive = (task: DeferredTask) =>
    task.status === 'pending' || isDeferredTaskRunning(task)
export const updateDeferredTask = (
    id: number,
    changes: Partial<Omit<DeferredTask, 'id' | 'chatId' | 'kind' | 'mode' | 'createdAt'>>
) => {
    useDeferredTaskState.setState((state) => {
        const task = state.tasks[id]
        return task ? { tasks: { ...state.tasks, [id]: { ...task, ...changes } } } : state
    })
}
export const dismissDeferredTask = (id: number) => {
    useDeferredTaskState.setState((state) => {
        if (!state.tasks[id] || isDeferredTaskActive(state.tasks[id])) return state
        const tasks = { ...state.tasks }
        delete tasks[id]
        return { tasks }
    })
}
