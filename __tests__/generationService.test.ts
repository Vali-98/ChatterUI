import BackgroundService from 'react-native-background-actions'

import { runGenerationTask } from '../lib/engine/generation/service'

jest.mock('react-native-background-actions', () => ({
    __esModule: true,
    default: { start: jest.fn(), stop: jest.fn() },
}))
jest.mock('../lib/state/Logger', () => ({ Logger: { stackTrace: jest.fn() } }))
const tick = async () => {
    for (let i = 0; i < 30; i++) await Promise.resolve()
}
beforeEach(() => {
    jest.clearAllMocks()
    jest.mocked(BackgroundService.start).mockImplementation(async (run) => {
        void run!()
    })
    jest.mocked(BackgroundService.stop).mockResolvedValue(undefined)
})

test('stopping waits for all tasks, and submissions during native shutdown wait for the next service', async () => {
    let completeFirst!: () => void
    let completeSecond!: () => void
    let stop!: () => void
    jest.mocked(BackgroundService.stop).mockImplementationOnce(
        () =>
            new Promise<void>((resolve) => {
                stop = resolve
            })
    )
    const first = runGenerationTask(
        () =>
            new Promise<void>((resolve) => {
                completeFirst = resolve
            })
    )
    const second = runGenerationTask(
        () =>
            new Promise<void>((resolve) => {
                completeSecond = resolve
            })
    )
    await tick()
    completeFirst()
    await first
    expect(BackgroundService.stop).not.toHaveBeenCalled()
    completeSecond()
    await second
    await tick()
    expect(BackgroundService.start).toHaveBeenCalledTimes(1)
    expect(BackgroundService.stop).toHaveBeenCalledTimes(1)
    const work = jest.fn(async () => {})
    const third = runGenerationTask(work)
    await tick()
    expect(work).not.toHaveBeenCalled()
    stop()
    await third
    await tick()
    expect(BackgroundService.start).toHaveBeenCalledTimes(2)
    expect(BackgroundService.stop).toHaveBeenCalledTimes(2)
})

test('startup failure rejects each waiting task and permits a later restart', async () => {
    jest.mocked(BackgroundService.start).mockRejectedValueOnce(new Error('unavailable'))
    await expect(runGenerationTask(async () => {})).rejects.toThrow('unavailable')
    await runGenerationTask(async () => {})
    await tick()
    expect(BackgroundService.start).toHaveBeenCalledTimes(2)
})
