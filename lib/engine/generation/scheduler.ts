import { AppSettings } from '@lib/constants/appSettings'
import { Logger } from '@lib/state/Logger'
import { mmkv } from '@lib/storage/MMKV'

import {
    isDeferredTaskActive,
    isDeferredTaskRunning,
    updateDeferredTask,
    useDeferredTaskState,
    type DeferredTask,
} from './deferredState'
import { useLocalModelResourceState } from './localResource'
import { runGenerationTask } from './service'
import { generationForChat, isActiveGeneration, useGenerationState } from './state'

export type DeferredTaskOptions = Pick<DeferredTask, 'mode' | 'kind'> & {
    parentGenerationId?: number
    resourceId?: number
    timeoutMs?: number | null
    queueTimeoutMs?: number
}
export type DeferredTaskHandle = { id: number; done: Promise<void>; cancel: () => void }

type DeferredTaskRun = (signal: AbortSignal) => Promise<void>
type DeferredRuntime = {
    controller: AbortController
    run: DeferredTaskRun
    resolve?: () => void
    timedOut: boolean
    timeoutMs: number | null
    timer?: ReturnType<typeof setTimeout>
}
const deferredRuntimes = new Map<number, DeferredRuntime>()
let nextDeferredTaskId = 0

export const canStartGeneration = (chatId: number, mode: 'local' | 'remote') => {
    if (mode === 'local' && useLocalModelResourceState.getState().operations > 0) return false
    const generations = Object.values(useGenerationState.getState().generations)
    if (
        generationForChat(chatId) ||
        generations.some((item) => item.chatId === chatId && item.error && !item.persisted)
    )
        return false
    const foreground = generations.filter(isActiveGeneration)
    const deferred = Object.values(useDeferredTaskState.getState().tasks).filter(
        isDeferredTaskRunning
    )
    if (mmkv.getBoolean(AppSettings.ConcurrentGenerations) === false)
        return !foreground.length && !deferred.length
    return (
        mode !== 'local' ||
        (!foreground.some((item) => item.mode === 'local') &&
            !deferred.some((item) => item.mode === 'local'))
    )
}

export const cancelDeferredTask = (id: number) => {
    const task = useDeferredTaskState.getState().tasks[id]
    const runtime = deferredRuntimes.get(id)
    if (!task || !runtime || !isDeferredTaskActive(task)) return
    if (runtime.timer) clearTimeout(runtime.timer)
    updateDeferredTask(
        id,
        task.status === 'pending'
            ? { status: runtime.timedOut ? 'timed_out' : 'cancelled', finishedAt: Date.now() }
            : { status: 'cancelling' }
    )
    runtime.controller.abort()
    // Running tasks retain capacity until their cooperative cancellation has settled.
    if (task.status === 'pending') runtime.resolve?.()
}

// Registration includes queue time. Only running/cancelling tasks occupy inference capacity.
export const scheduleDeferredTask = (
    chatId: number,
    run: DeferredTaskRun,
    options: DeferredTaskOptions
): DeferredTaskHandle => {
    const id = ++nextDeferredTaskId
    const task: DeferredTask = {
        id: id,
        resourceId: options.resourceId,
        parentGenerationId: options.parentGenerationId,
        chatId: chatId,
        kind: options.kind,
        mode: options.mode,
        status: 'pending',
        createdAt: Date.now(),
    }
    const runtime: DeferredRuntime = {
        controller: new AbortController(),
        run: run,
        timedOut: false,
        timeoutMs: options.timeoutMs ?? null,
    }
    deferredRuntimes.set(id, runtime)
    useDeferredTaskState.setState((state) => ({ tasks: { ...state.tasks, [id]: task } }))
    const timeout = () => {
        runtime.timedOut = true
        cancelDeferredTask(id)
    }
    if (options.queueTimeoutMs !== undefined)
        runtime.timer = setTimeout(timeout, options.queueTimeoutMs)
    const done = runGenerationTask(
        () =>
            new Promise<void>((resolve) => {
                runtime.resolve = resolve
                if (runtime.controller.signal.aborted) resolve()
                else queueMicrotask(runPendingDeferredTasks)
            })
    )
        .catch((error) => {
            updateDeferredTask(id, {
                status: 'failed',
                error: String(error),
                finishedAt: Date.now(),
            })
            throw error
        })
        .finally(() => {
            if (runtime.timer) clearTimeout(runtime.timer)
            deferredRuntimes.delete(id)
        })
    void done.catch(Logger.stackTrace)
    return { id: id, done: done, cancel: () => cancelDeferredTask(id) }
}

const runPendingDeferredTasks = () => {
    for (const task of Object.values(useDeferredTaskState.getState().tasks)) {
        const runtime = deferredRuntimes.get(task.id)
        if (task.status !== 'pending' || !runtime?.resolve) continue
        const foreground = Object.values(useGenerationState.getState().generations).filter(
            (generation) =>
                isActiveGeneration(generation) && generation.id !== task.parentGenerationId
        )
        const deferred = Object.values(useDeferredTaskState.getState().tasks).filter(
            isDeferredTaskRunning
        )
        const exclusive = mmkv.getBoolean(AppSettings.ConcurrentGenerations) === false
        if (
            (exclusive && (foreground.length || deferred.length)) ||
            (task.mode === 'local' &&
                (useLocalModelResourceState.getState().operations > 0 ||
                    foreground.some((item) => item.mode === 'local') ||
                    deferred.some((item) => item.mode === 'local')))
        )
            continue
        if (runtime.timer) clearTimeout(runtime.timer)
        updateDeferredTask(task.id, { status: 'running', startedAt: Date.now() })
        if (runtime.timeoutMs !== null)
            runtime.timer = setTimeout(() => {
                runtime.timedOut = true
                cancelDeferredTask(task.id)
            }, runtime.timeoutMs)
        void Promise.resolve()
            .then(() => runtime.run(runtime.controller.signal))
            .then(
                () => completeDeferredTask(task.id),
                (error: unknown) => completeDeferredTask(task.id, error, true)
            )
    }
}
const completeDeferredTask = (id: number, error?: unknown, failed = false) => {
    const runtime = deferredRuntimes.get(id)
    if (!runtime) return
    if (runtime.timer) clearTimeout(runtime.timer)
    const status = runtime.timedOut
        ? 'timed_out'
        : runtime.controller.signal.aborted
          ? 'cancelled'
          : failed
            ? 'failed'
            : 'completed'
    updateDeferredTask(id, {
        status: status,
        finishedAt: Date.now(),
        error: failed ? String(error) : undefined,
    })
    if (failed && !runtime.controller.signal.aborted) Logger.stackTrace(error)
    runtime.resolve?.()
    queueMicrotask(runPendingDeferredTasks)
}
let previousActiveIds = ''
useGenerationState.subscribe((state) => {
    const activeIds = Object.values(state.generations)
        .filter(isActiveGeneration)
        .map((item) => item.id)
        .join(',')
    if (previousActiveIds === activeIds) return
    previousActiveIds = activeIds
    queueMicrotask(runPendingDeferredTasks)
})
useLocalModelResourceState.subscribe((state) => {
    if (state.operations === 0) queueMicrotask(runPendingDeferredTasks)
})
