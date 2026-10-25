import { createQueryObserver, equalQueryData } from '../lib/queries/queryObserver'

const deferred = <T>() => {
    let resolve!: (value: T) => void
    let reject!: (error: Error) => void
    const promise = new Promise<T>((res, rej) => {
        resolve = res
        reject = rej
    })
    return { promise, resolve, reject }
}

const makeListener = () => {
    let invalidate = () => {}
    const remove = jest.fn()
    const listen = jest.fn((callback: () => void) => {
        invalidate = callback
        return remove
    })
    return { listen: listen, remove: remove, invalidate: () => invalidate() }
}

const flush = async () => {
    await Promise.resolve()
    await Promise.resolve()
}

describe('live query snapshots', () => {
    test('sync reads are immediately available and snapshot reads are cached', () => {
        const read = jest.fn(() => ({ name: 'Alice' }))
        const source = makeListener()
        const observer = createQueryObserver({ read: read, mode: 'sync', enabled: true, ...source })
        expect(observer.getSnapshot().data).toEqual({ name: 'Alice' })
        expect(observer.getSnapshot()).toBe(observer.getSnapshot())
        expect(read).toHaveBeenCalledTimes(1)
    })

    test('subscription rechecks the render-to-subscribe gap and suppresses unchanged results', () => {
        let name = 'Alice'
        const source = makeListener()
        const observer = createQueryObserver({
            read: () => ({ name: name, nested: [{ value: 1 }] }),
            mode: 'sync',
            enabled: true,
            ...source,
        })
        name = 'Bob'
        const notify = jest.fn()
        const unsubscribe = observer.subscribe(notify)
        expect(observer.getSnapshot().data?.name).toBe('Bob')
        expect(notify).toHaveBeenCalledTimes(1)
        const snapshot = observer.getSnapshot()
        source.invalidate()
        expect(notify).toHaveBeenCalledTimes(1)
        expect(observer.getSnapshot()).toBe(snapshot)
        unsubscribe()
        expect(source.remove).toHaveBeenCalledTimes(1)
    })

    test('a shared observer listens until its last subscriber leaves', () => {
        const source = makeListener()
        const observer = createQueryObserver({
            read: () => 1,
            mode: 'sync',
            enabled: true,
            ...source,
        })
        const first = observer.subscribe(jest.fn())
        const second = observer.subscribe(jest.fn())
        expect(source.listen).toHaveBeenCalledTimes(1)
        first()
        expect(source.remove).not.toHaveBeenCalled()
        second()
        expect(source.remove).toHaveBeenCalledTimes(1)
    })

    test('disabled queries neither read nor subscribe', () => {
        const read = jest.fn(() => 1)
        const source = makeListener()
        const observer = createQueryObserver({
            read: read,
            mode: 'sync',
            enabled: false,
            ...source,
        })
        observer.subscribe(jest.fn())()
        expect(read).not.toHaveBeenCalled()
        expect(source.listen).not.toHaveBeenCalled()
        expect(observer.getSnapshot()).toMatchObject({ data: undefined, isLoading: false })
    })

    test('async queries start at subscription and report loading', async () => {
        const pending = deferred<number[]>()
        const read = jest.fn(() => pending.promise)
        const source = makeListener()
        const observer = createQueryObserver({
            read: read,
            mode: 'async',
            enabled: true,
            ...source,
        })
        expect(read).not.toHaveBeenCalled()
        expect(observer.getSnapshot()).toMatchObject({ data: undefined, isLoading: true })
        const unsubscribe = observer.subscribe(jest.fn())
        pending.resolve([])
        await flush()
        expect(observer.getSnapshot()).toMatchObject({
            data: [],
            isLoading: false,
            error: undefined,
        })
        unsubscribe()
    })

    test('older async results and errors cannot replace a newer result', async () => {
        const old = deferred<string>()
        const newer = deferred<string>()
        const obsolete = deferred<string>()
        const read = jest
            .fn()
            .mockReturnValueOnce(old.promise)
            .mockReturnValueOnce(obsolete.promise)
            .mockReturnValueOnce(newer.promise)
        const source = makeListener()
        const observer = createQueryObserver<string>({
            read: read,
            mode: 'async',
            enabled: true,
            ...source,
        })
        const unsubscribe = observer.subscribe(jest.fn())
        source.invalidate()
        source.invalidate()
        newer.resolve('new')
        await flush()
        old.resolve('old')
        obsolete.reject(new Error('obsolete'))
        await flush()
        expect(observer.getSnapshot()).toMatchObject({ data: 'new', error: undefined })
        unsubscribe()
    })

    test('pending requests are ignored after unsubscribe, including during a resubscribe', async () => {
        const old = deferred<string>()
        const current = deferred<string>()
        const read = jest.fn().mockReturnValueOnce(old.promise).mockReturnValueOnce(current.promise)
        const source = makeListener()
        const observer = createQueryObserver<string>({
            read: read,
            mode: 'async',
            enabled: true,
            ...source,
        })
        observer.subscribe(jest.fn())()
        const unsubscribe = observer.subscribe(jest.fn())
        old.resolve('old')
        await flush()
        expect(observer.getSnapshot().data).toBeUndefined()
        current.resolve('current')
        await flush()
        expect(observer.getSnapshot().data).toBe('current')
        unsubscribe()
    })

    test('query failures retain saved data and a later invalidation recovers', () => {
        let fail = false
        const source = makeListener()
        const observer = createQueryObserver({
            read: () => {
                if (fail) throw new Error('read failed')
                return { name: 'Alice' }
            },
            mode: 'sync',
            enabled: true,
            ...source,
        })
        const unsubscribe = observer.subscribe(jest.fn())
        fail = true
        source.invalidate()
        expect(observer.getSnapshot().error?.message).toBe('read failed')
        expect(observer.getSnapshot().data).toEqual({ name: 'Alice' })
        fail = false
        source.invalidate()
        expect(observer.getSnapshot().error).toBeUndefined()
        unsubscribe()
    })

    test('structural equality handles nested results, dates, binary data and deletions', () => {
        const value = () => ({
            rows: [{ id: 1 }],
            date: new Date(123),
            bytes: new Uint8Array([1, 2]),
        })
        expect(equalQueryData(value(), value())).toBe(true)
        expect(equalQueryData({ a: undefined }, { b: undefined })).toBe(false)
        expect(equalQueryData([1, 2], [1])).toBe(false)
        expect(equalQueryData(new Date(1), new Date(2))).toBe(false)
        expect(equalQueryData(new Uint8Array([1]), new Uint8Array([2]))).toBe(false)
    })
})

test('an initially empty sync query records success without notifying again on subscribe', () => {
    const observer = createQueryObserver<number[]>({
        read: () => [],
        mode: 'sync',
        enabled: true,
        initialData: [],
        listen: () => () => {},
    })
    expect(observer.getSnapshot().data).toEqual([])
    expect(observer.getSnapshot().updatedAt).toBeInstanceOf(Date)
    const notify = jest.fn()
    const unsubscribe = observer.subscribe(notify)
    expect(notify).not.toHaveBeenCalled()
    unsubscribe()
})
