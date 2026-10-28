import { DownloadTask } from 'expo-file-system'

import {
    pauseDownload,
    removeDownload,
    resumeDownload,
    startDownload,
} from '../lib/downloads/manager'
import { useDownloadStore } from '../lib/downloads/store'

const mockFiles = new Map<string, number>()
jest.mock('expo-crypto', () => ({ randomUUID: () => 'test-download' }))
jest.mock('../lib/storage/MMKV', () => ({
    createMMKVStorage: () => ({ getItem: () => null, setItem: jest.fn(), removeItem: jest.fn() }),
}))
jest.mock('../lib/background/service', () => ({
    runBackgroundTask: async (run: () => Promise<void>) => run(),
    updateDownloadNotification: jest.fn(),
    onBackgroundExpiration: jest.fn(),
}))
jest.mock('expo-file-system', () => ({
    Paths: { document: { uri: 'file:///documents' } },
    DownloadTask: Object.assign(jest.fn(), { fromSavable: jest.fn() }),
    Directory: class {
        uri: string
        constructor(value: string) {
            this.uri = value
        }
        create() {}
    },
    File: class {
        uri: string
        constructor(...parts: (string | { uri: string })[]) {
            this.uri = parts.map((part) => (typeof part === 'string' ? part : part.uri)).join('/')
        }
        get parentDirectory() {
            return { uri: this.uri.slice(0, this.uri.lastIndexOf('/')), create: jest.fn() }
        }
        get exists() {
            return mockFiles.has(this.uri)
        }
        get size() {
            return mockFiles.get(this.uri) ?? 0
        }
        delete() {
            mockFiles.delete(this.uri)
        }
        move(destination: { uri: string }) {
            mockFiles.set(destination.uri, this.size)
            this.delete()
        }
    },
}))
const destination = 'file:///documents/models/test.gguf'
const entry = () => useDownloadStore.getState().downloads[0]
const tick = async () => {
    for (let i = 0; i < 30; i++) await Promise.resolve()
}
let complete: (result: unknown) => void
let fail: (error: Error) => void
let task: {
    downloadAsync: jest.Mock
    resumeAsync: jest.Mock
    pauseAsync: jest.Mock
    cancel: jest.Mock
    savable: jest.Mock
    release: jest.Mock
}
beforeEach(() => {
    jest.clearAllMocks()
    mockFiles.clear()
    useDownloadStore.setState({ downloads: [] })
    task = {
        downloadAsync: jest.fn(
            () =>
                new Promise((resolve, reject) => {
                    complete = resolve
                    fail = reject
                })
        ),
        resumeAsync: jest.fn(
            () =>
                new Promise((resolve, reject) => {
                    complete = resolve
                    fail = reject
                })
        ),
        pauseAsync: jest.fn(async () => {
            complete(undefined)
            return undefined
        }),
        cancel: jest.fn(() => {
            complete(undefined)
        }),
        savable: jest.fn(() => ({
            url: 'https://example.com/test.gguf',
            fileUri: entry().partialUri,
            isDirectory: false,
            resumeData: 'checkpoint',
        })),
        release: jest.fn(),
    }
    jest.mocked(DownloadTask).mockReturnValue(task as never)
    jest.mocked(DownloadTask.fromSavable).mockReturnValue(task as never)
})
const start = () =>
    startDownload({ name: 'test.gguf', url: 'https://example.com/test.gguf', destination })

test('publishes only a completed successful file and clearing history preserves it', async () => {
    const id = start()
    expect(mockFiles.has(destination)).toBe(false)
    mockFiles.set(entry().partialUri, 1234)
    complete({ uri: entry().partialUri })
    await tick()
    expect(entry().status).toBe('completed')
    expect(mockFiles.get(destination)).toBe(1234)
    await removeDownload(id)
    expect(mockFiles.get(destination)).toBe(1234)
})

test('failed transfers never publish a model', async () => {
    start()
    mockFiles.set(entry().partialUri, 10)
    fail(new Error('HTTP 403'))
    await tick()
    expect(entry()).toMatchObject({ status: 'failed' })
    expect(mockFiles.has(destination)).toBe(false)
    // A failed transfer stays outside the model directory; retry restarts partial data.
    expect(mockFiles.has(entry().partialUri)).toBe(true)
})

test('pause saves native resume data and resuming uses it without creating another entry', async () => {
    const id = start()
    mockFiles.set(entry().partialUri, 100)
    await pauseDownload(id)
    await tick()
    expect(entry()).toMatchObject({
        status: 'paused',
        resumeState: expect.objectContaining({ resumeData: 'checkpoint' }),
    })
    const done = resumeDownload(id)
    expect(DownloadTask.fromSavable).toHaveBeenCalledWith(
        expect.objectContaining({ resumeData: 'checkpoint' }),
        expect.objectContaining({ onProgress: expect.any(Function) })
    )
    complete({ uri: entry().partialUri })
    await done
    expect(task.resumeAsync).toHaveBeenCalledTimes(1)
    expect(useDownloadStore.getState().downloads).toHaveLength(1)
})

test('cancel deletes partial content, never another completed file', async () => {
    const id = start()
    mockFiles.set(entry().partialUri, 100)
    mockFiles.set('file:///another-model.gguf', 900)
    await removeDownload(id)
    await tick()
    expect(useDownloadStore.getState().downloads).toEqual([])
    expect(mockFiles.get('file:///another-model.gguf')).toBe(900)
    expect(mockFiles.size).toBe(1)
})

test('an existing destination is never overwritten', async () => {
    mockFiles.set(destination, 900)
    start()
    await tick()
    expect(entry().status).toBe('failed')
    expect(mockFiles.get(destination)).toBe(900)
    expect(DownloadTask).not.toHaveBeenCalled()
})

test('restoring a running download makes it manually resumable without launching native work', () => {
    const restored = useDownloadStore.persist.getOptions().merge!(
        {
            downloads: [
                { id: 'restored', status: 'downloading', resumeState: { resumeData: 'saved' } },
            ],
        },
        useDownloadStore.getState()
    )
    expect(restored.downloads[0]).toMatchObject({
        status: 'paused',
        resumeState: { resumeData: 'saved' },
    })
    expect(DownloadTask).not.toHaveBeenCalled()
})

test('native resume state is restored even when iOS has not created the destination file yet', async () => {
    useDownloadStore.getState().add({
        id: 'ios-restored',
        name: 'test.gguf',
        url: 'https://example.com/test.gguf',
        destination,
        partialUri: 'file:///documents/downloads/ios.part',
        status: 'paused',
        bytesWritten: 100,
        totalBytes: 1000,
        resumeState: {
            url: 'https://example.com/test.gguf',
            fileUri: 'file:///documents/downloads/ios.part',
            isDirectory: false,
            resumeData: 'ios-checkpoint',
        },
    })
    const done = resumeDownload('ios-restored')
    expect(DownloadTask.fromSavable).toHaveBeenCalled()
    mockFiles.set(entry().partialUri, 1000)
    complete({ uri: entry().partialUri })
    await done
    expect(mockFiles.get(destination)).toBe(1000)
})
