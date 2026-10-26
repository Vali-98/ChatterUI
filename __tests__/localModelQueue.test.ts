import {
    runLocalModelOperation,
    useLocalModelResourceState,
} from '../lib/engine/generation/localResource'

const deferred = <T>() => {
    let resolve!: (value: T) => void
    let reject!: (error: unknown) => void
    const promise = new Promise<T>((complete, fail) => {
        resolve = complete
        reject = fail
    })
    return { promise, resolve, reject }
}

test('model operations run in submission order and queued work keeps local capacity occupied', async () => {
    const first = deferred<void>()
    const second = deferred<void>()
    const order: string[] = []
    const counts: number[] = []
    const unsubscribe = useLocalModelResourceState.subscribe((state) =>
        counts.push(state.operations)
    )
    const load = runLocalModelOperation(async () => {
        order.push('load')
        await first.promise
    })
    const unload = runLocalModelOperation(async () => {
        order.push('unload')
        await second.promise
    })
    expect(useLocalModelResourceState.getState().operations).toBe(2)
    await Promise.resolve()
    expect(order).toEqual(['load'])
    first.resolve()
    await load
    await Promise.resolve()
    expect(order).toEqual(['load', 'unload'])
    expect(useLocalModelResourceState.getState().operations).toBe(1)
    second.resolve()
    await unload
    expect(counts).toEqual([1, 2, 1, 0])
    unsubscribe()
})

test('a failed native operation rejects its caller without stalling the queue', async () => {
    const order: string[] = []
    const first = runLocalModelOperation(async () => {
        order.push('failed load')
        throw new Error('out of memory')
    })
    const next = runLocalModelOperation(async () => {
        order.push('cleanup')
        return 'released'
    })
    await expect(first).rejects.toThrow('out of memory')
    await expect(next).resolves.toBe('released')
    expect(order).toEqual(['failed load', 'cleanup'])
    expect(useLocalModelResourceState.getState().operations).toBe(0)
})
