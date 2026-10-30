import type { DownloadPauseState } from 'expo-file-system'
import { create } from 'zustand'
import { persist } from 'zustand/middleware'

import { Storage } from '@lib/constants/storageKeys'
import { createMMKVStorage } from '@lib/storage/MMKV'

export type Download = {
    id: string
    name: string
    url: string
    destination: string
    partialUri: string
    status: 'paused' | 'downloading' | 'pausing' | 'completed' | 'failed'
    bytesWritten: number
    totalBytes: number
    resumeState?: DownloadPauseState
    error?: string
}

type DownloadStore = {
    downloads: Download[]
    add: (download: Download) => void
    update: (id: string, changes: Partial<Download>) => void
    remove: (id: string) => void
}

export const useDownloadStore = create<DownloadStore>()(
    persist(
        (set) => ({
            downloads: [],
            add: (download) => set((state) => ({ downloads: [...state.downloads, download] })),
            update: (id, changes) =>
                set((state) => ({
                    downloads: state.downloads.map((item) =>
                        item.id === id ? { ...item, ...changes } : item
                    ),
                })),
            remove: (id) =>
                set((state) => ({ downloads: state.downloads.filter((item) => item.id !== id) })),
        }),
        {
            name: Storage.Downloads,
            storage: createMMKVStorage(),
            // Native tasks do not survive a process restart. Explicitly resume saved work.
            merge: (persisted, current) => ({
                ...current,
                downloads: ((persisted as { downloads?: Download[] })?.downloads ?? []).map(
                    (item) => ({
                        ...item,
                        status:
                            item.status === 'downloading' || item.status === 'pausing'
                                ? 'paused'
                                : item.status,
                    })
                ),
            }),
            partialize: (state) => ({ downloads: state.downloads }),
        }
    )
)
