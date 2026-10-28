import { randomUUID } from 'expo-crypto'
import { Directory, DownloadTask, File, Paths, type DownloadProgress } from 'expo-file-system'

import {
    onBackgroundExpiration,
    runBackgroundTask,
    updateDownloadNotification,
} from '@lib/background/service'

import { useDownloadStore } from './store'

const active = new Map<string, DownloadTask>()
const pending = new Set<string>()
const pausing = new Map<string, Promise<void>>()
const cancelled = new Set<string>()
const settled = new Map<string, Promise<void>>()
const store = useDownloadStore

const notify = () => {
    const running = store.getState().downloads.filter((item) => item.status === 'downloading')
    updateDownloadNotification(
        running.reduce((sum, item) => sum + item.bytesWritten, 0),
        running.some((item) => !item.totalBytes)
            ? 0
            : running.reduce((sum, item) => sum + item.totalBytes, 0),
        running.length
    )
}

export const resumeDownload = async (id: string, restart = false) => {
    if (pending.has(id) || active.has(id)) return
    const entry = store.getState().downloads.find((item) => item.id === id)
    if (!entry || entry.status === 'completed') return
    pending.add(id)
    try {
        await runBackgroundTask(async () => {
            if (cancelled.has(id)) return
            const partial = new File(entry.partialUri)
            const destination = new File(entry.destination)
            new Directory(partial.parentDirectory.uri).create({
                intermediates: true,
                idempotent: true,
            })
            destination.parentDirectory.create({ intermediates: true, idempotent: true })
            if (destination.exists) throw new Error('A file already exists at the destination.')
            const resumeState = restart ? undefined : entry.resumeState
            if (!resumeState && partial.exists) partial.delete()
            store.getState().update(id, {
                status: 'downloading',
                error: undefined,
                ...(resumeState ? {} : { bytesWritten: 0, resumeState: undefined }),
            })
            let lastUpdate = 0
            const options = {
                sessionType: 'background' as const,
                onProgress: (progress: DownloadProgress) => {
                    if (Date.now() - lastUpdate < 300) return
                    lastUpdate = Date.now()
                    store.getState().update(id, {
                        bytesWritten: progress.bytesWritten,
                        totalBytes: Math.max(0, progress.totalBytes),
                    })
                    notify()
                },
            }
            const task = resumeState
                ? DownloadTask.fromSavable(resumeState, options)
                : new DownloadTask(entry.url, partial, options)
            active.set(id, task)
            notify()
            try {
                const transfer = resumeState ? task.resumeAsync() : task.downloadAsync()
                settled.set(
                    id,
                    transfer.then(
                        () => {},
                        () => {}
                    )
                )
                const result = await transfer
                if (cancelled.has(id)) return
                if (pausing.has(id)) await pausing.get(id)
                if (!result || cancelled.has(id)) return
                partial.move(destination)
                store.getState().update(id, {
                    status: 'completed',
                    bytesWritten: destination.size,
                    totalBytes: destination.size,
                    resumeState: undefined,
                })
            } finally {
                await pausing.get(id)
                active.delete(id)
                settled.delete(id)
                task.release()
                notify()
            }
        })
    } catch (error) {
        if (!cancelled.has(id))
            store.getState().update(id, {
                status: 'failed',
                error: error instanceof Error ? error.message : String(error),
            })
    } finally {
        notify()
        pending.delete(id)
        cancelled.delete(id)
    }
}

export const startDownload = (input: { name: string; url: string; destination: string }) => {
    const existing = store
        .getState()
        .downloads.find((item) => item.destination === input.destination)
    if (existing) {
        if (existing.status === 'completed' && !new File(existing.destination).exists) {
            store
                .getState()
                .update(existing.id, { status: 'paused', bytesWritten: 0, resumeState: undefined })
        }
        void resumeDownload(existing.id)
        return existing.id
    }
    const url = new URL(input.url)
    if (!['https:', 'http:'].includes(url.protocol))
        throw new Error('Use an HTTP or HTTPS download URL.')
    const id = randomUUID()
    store.getState().add({
        ...input,
        id,
        partialUri: new File(Paths.document, 'downloads', `${id}.part`).uri,
        status: 'paused',
        bytesWritten: 0,
        totalBytes: 0,
    })
    void resumeDownload(id)
    return id
}

export const pauseDownload = (id: string): Promise<void> => {
    const previous = pausing.get(id)
    if (previous) return previous
    const task = active.get(id)
    if (!task) return Promise.resolve()
    store.getState().update(id, { status: 'pausing' })
    const done = task
        .pauseAsync()
        .then(() => {
            store.getState().update(id, { status: 'paused', resumeState: task.savable() })
        })
        .catch((error) => {
            store.getState().update(id, { status: 'downloading', error: String(error) })
        })
        .finally(() => {
            pausing.delete(id)
            notify()
        })
    pausing.set(id, done)
    return done
}

// Removing completed entries leaves their files intact; cancelling removes only partial data.
export const removeDownload = async (id: string) => {
    const entry = store.getState().downloads.find((item) => item.id === id)
    if (!entry) return
    cancelled.add(id)
    const task = active.get(id)
    if (task) task.cancel()
    await settled.get(id)
    await pausing.get(id)
    const partial = new File(entry.partialUri)
    if (partial.exists) partial.delete()
    store.getState().remove(id)
    if (!pending.has(id)) cancelled.delete(id)
    notify()
}

// iOS may expire the app's background allowance. Save native checkpoints before suspension.
onBackgroundExpiration(() => {
    void Promise.all([...active.keys()].map(pauseDownload))
})
