import { isDeferredTaskRunning, useDeferredTaskState } from '../lib/engine/generation/deferredState'
import { useChatAccessState } from '../lib/state/chat/access'
import BackgroundService from 'react-native-background-actions'

import { runGenerationTask } from '../lib/engine/generation/service'
import { AppSettings } from '../lib/constants/GlobalValues'
import { runLocalModelOperation } from '../lib/engine/generation/localResource'
import { beginGeneration } from '../lib/engine/generation/runtime'
import { canStartGeneration, scheduleDeferredTask } from '../lib/engine/generation/scheduler'
import { updateGeneration, useGenerationState } from '../lib/engine/generation/state'
import { mmkv } from '../lib/storage/MMKV'

jest.mock('react-native-background-actions', () => ({
    __esModule: true,
    default: { start: jest.fn(), stop: jest.fn() },
}))
jest.mock('../lib/storage/MMKV', () => ({ mmkv: { getBoolean: jest.fn() } }))
jest.mock('../lib/state/Logger', () => ({ Logger: { stackTrace: jest.fn() } }))
const tick = async () => {
    for (let i = 0; i < 15; i++) await Promise.resolve()
}
const begin = (chatId: number, mode: 'local' | 'remote' = 'remote') =>
    beginGeneration({ chatId, mode, swipeId: chatId, text: '' })
beforeEach(() => {
    useChatAccessState.setState({ leases: {} })
    jest.clearAllMocks()
    useDeferredTaskState.setState({ tasks: {} })
    jest.mocked(BackgroundService.start).mockImplementation(async (run) => {
        void run!()
    })
    jest.mocked(BackgroundService.stop).mockResolvedValue(undefined)
    useGenerationState.setState({ generations: {} })
    jest.mocked(mmkv.getBoolean).mockReturnValue(undefined)
})

afterEach(async () => {
    await tick()
})

test('remote concurrency defaults on while each chat still permits only one foreground generation', () => {
    expect(begin(1)).toBeDefined()
    expect(begin(2)).toBeDefined()
    expect(begin(1)).toBeUndefined()
})

test('local capacity remains one alongside concurrent remote work', () => {
    expect(begin(1, 'local')).toBeDefined()
    expect(begin(2)).toBeDefined()
    expect(begin(3, 'local')).toBeUndefined()
})

test('disabled concurrency blocks new requests across all modes instead of queuing them', () => {
    jest.mocked(mmkv.getBoolean).mockImplementation((key) =>
        key === AppSettings.ConcurrentGenerations ? false : undefined
    )
    const first = begin(1)!
    expect(begin(2)).toBeUndefined()
    expect(begin(3, 'local')).toBeUndefined()
    updateGeneration(first.id, { status: 'completed', persisted: true })
    expect(begin(2)).toBeDefined()
})

test('deferred tasks wait for exclusive capacity and publish its release', async () => {
    jest.mocked(mmkv.getBoolean).mockReturnValue(false)
    const first = begin(1)!
    let finish!: () => void
    const run = jest.fn(
        () =>
            new Promise<void>((resolve) => {
                finish = resolve
            })
    )
    scheduleDeferredTask(1, run, { mode: 'remote', kind: 'title' })
    await tick()
    expect(run).not.toHaveBeenCalled()
    updateGeneration(first.id, { status: 'completed', persisted: true })
    await tick()
    expect(run).toHaveBeenCalledTimes(1)
    expect(canStartGeneration(2, 'remote')).toBe(false)
    expect(
        Object.values(useDeferredTaskState.getState().tasks).filter(isDeferredTaskRunning).length
    ).toBe(1)
    finish()
    await tick()
    expect(canStartGeneration(2, 'remote')).toBe(true)
    expect(
        Object.values(useDeferredTaskState.getState().tasks).filter(isDeferredTaskRunning).length
    ).toBe(0)
})

test('foreground reservations win before pending deferred tasks run', async () => {
    jest.mocked(mmkv.getBoolean).mockReturnValue(false)
    const run = jest.fn(async () => {})
    scheduleDeferredTask(1, run, { mode: 'remote', kind: 'title' })
    const foreground = begin(1)!
    await tick()
    expect(run).not.toHaveBeenCalled()
    updateGeneration(foreground.id, { status: 'completed', persisted: true })
    await tick()
    expect(run).toHaveBeenCalledTimes(1)
})

test('model loading and unloading occupy local capacity even before a generation exists', async () => {
    let release!: () => void
    const operation = runLocalModelOperation(
        () =>
            new Promise<void>((resolve) => {
                release = resolve
            })
    )
    expect(canStartGeneration(1, 'local')).toBe(false)
    expect(canStartGeneration(1, 'remote')).toBe(true)
    await Promise.resolve()
    release()
    await operation
    expect(canStartGeneration(1, 'local')).toBe(true)
})

test('queued deferred work keeps the native service alive through the foreground handoff', async () => {
    let releaseModel!: () => void
    const loading = runLocalModelOperation(
        () =>
            new Promise<void>((resolve) => {
                releaseModel = resolve
            })
    )
    const run = jest.fn(async () => {})
    await runGenerationTask(async () => {
        scheduleDeferredTask(1, run, { mode: 'local', kind: 'title' })
    })
    await tick()
    expect(run).not.toHaveBeenCalled()
    expect(
        Object.values(useDeferredTaskState.getState().tasks).filter(isDeferredTaskRunning).length
    ).toBe(0)
    expect(BackgroundService.start).toHaveBeenCalledTimes(1)
    expect(BackgroundService.stop).not.toHaveBeenCalled()
    releaseModel()
    await loading
    await tick()
    expect(run).toHaveBeenCalledTimes(1)
    expect(BackgroundService.start).toHaveBeenCalledTimes(1)
    expect(BackgroundService.stop).toHaveBeenCalledTimes(1)
})

test('a rejected deferred task releases capacity and lets the service stop', async () => {
    const error = new Error('title failed')
    scheduleDeferredTask(
        1,
        async () => {
            throw error
        },
        { mode: 'remote', kind: 'title' }
    )
    await tick()
    expect(
        Object.values(useDeferredTaskState.getState().tasks).filter(isDeferredTaskRunning).length
    ).toBe(0)
    expect(BackgroundService.stop).toHaveBeenCalledTimes(1)
})

test('service startup failure does not leave queued deferred work or occupied capacity', async () => {
    jest.mocked(BackgroundService.start).mockRejectedValueOnce(new Error('service unavailable'))
    const rejected = jest.fn(async () => {})
    scheduleDeferredTask(1, rejected, { mode: 'remote', kind: 'title' })
    await tick()
    expect(rejected).not.toHaveBeenCalled()
    expect(
        Object.values(useDeferredTaskState.getState().tasks).filter(isDeferredTaskRunning).length
    ).toBe(0)
    expect(canStartGeneration(1, 'remote')).toBe(true)
    const next = jest.fn(async () => {})
    scheduleDeferredTask(1, next, { mode: 'remote', kind: 'title' })
    await tick()
    expect(next).toHaveBeenCalledTimes(1)
    expect(rejected).not.toHaveBeenCalled()
    expect(BackgroundService.stop).toHaveBeenCalledTimes(1)
})

test('deferred metadata is reactive while queued, and pending cancellation prevents execution', async () => {
    jest.mocked(mmkv.getBoolean).mockReturnValue(false)
    begin(1)
    const statuses: string[] = []
    const unsubscribe = useDeferredTaskState.subscribe((state) => {
        const task = Object.values(state.tasks).find((item) => item.chatId === 42)
        if (task) statuses.push(task.status)
    })
    const run = jest.fn(async () => {})
    const handle = scheduleDeferredTask(42, run, { mode: 'remote', kind: 'title' })
    await tick()
    expect(useDeferredTaskState.getState().tasks[handle.id]).toMatchObject({
        chatId: 42,
        kind: 'title',
        status: 'pending',
    })
    handle.cancel()
    await handle.done
    expect(run).not.toHaveBeenCalled()
    expect(statuses).toEqual(['pending', 'cancelled'])
    unsubscribe()
})

test('running cancellation signals the task and retains capacity until it settles', async () => {
    jest.mocked(mmkv.getBoolean).mockReturnValue(false)
    let finish!: () => void
    let signal!: AbortSignal
    const handle = scheduleDeferredTask(
        42,
        (value) => {
            signal = value
            return new Promise<void>((resolve) => {
                finish = resolve
            })
        },
        { mode: 'remote', kind: 'title' }
    )
    await tick()
    handle.cancel()
    expect(signal.aborted).toBe(true)
    expect(useDeferredTaskState.getState().tasks[handle.id].status).toBe('cancelling')
    expect(canStartGeneration(2, 'remote')).toBe(false)
    finish()
    await handle.done
    expect(useDeferredTaskState.getState().tasks[handle.id].status).toBe('cancelled')
    expect(canStartGeneration(2, 'remote')).toBe(true)
})

test('execution deadlines abort deferred requests and expose timed_out', async () => {
    jest.useFakeTimers()
    try {
        const handle = scheduleDeferredTask(
            42,
            (signal) =>
                new Promise<void>((resolve) => {
                    signal.addEventListener('abort', () => resolve(), { once: true })
                }),
            { mode: 'remote', kind: 'title', timeoutMs: 100 }
        )
        await jest.advanceTimersByTimeAsync(0)
        expect(useDeferredTaskState.getState().tasks[handle.id].status).toBe('running')
        await jest.advanceTimersByTimeAsync(100)
        await handle.done
        expect(useDeferredTaskState.getState().tasks[handle.id]).toMatchObject({
            status: 'timed_out',
            finishedAt: expect.any(Number),
        })
    } finally {
        jest.useRealTimers()
    }
})

test('an optional queue deadline cancels a task before it runs', async () => {
    jest.useFakeTimers()
    try {
        jest.mocked(mmkv.getBoolean).mockReturnValue(false)
        begin(1)
        const run = jest.fn(async () => {})
        const handle = scheduleDeferredTask(42, run, {
            mode: 'remote',
            kind: 'title',
            queueTimeoutMs: 50,
        })
        await jest.advanceTimersByTimeAsync(50)
        await handle.done
        expect(run).not.toHaveBeenCalled()
        expect(useDeferredTaskState.getState().tasks[handle.id].status).toBe('timed_out')
    } finally {
        jest.useRealTimers()
    }
})
