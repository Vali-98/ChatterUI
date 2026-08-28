import { create } from 'zustand'
import { persist } from 'zustand/middleware'

import { Storage } from '@lib/enums/Storage'
import { createMMKVStorage } from '@lib/storage/MMKV'

export type LorebookPreferenceStore = {
    insertionLocation: 'afterLast' | 'beforeLast' | 'afterSystem' | 'index'
    insertionDepth: number
    setPreference: <T extends keyof Omit<LorebookPreferenceStore, 'setPreference'>>(
        key: T,
        value: LorebookPreferenceStore[T]
    ) => void
}

export const useLorebookPreferenceStore = create<LorebookPreferenceStore>()(
    persist(
        (set) => ({
            insertionLocation: 'afterSystem',
            insertionDepth: 1,
            setPreference: (key, value) => set({ [key]: value }),
        }),
        {
            version: 1,
            name: Storage.LorebookPreferences,
            storage: createMMKVStorage(),
            partialize: (store) => ({
                insertionLocation: store.insertionLocation,
                insertionDepth: store.insertionDepth,
            }),
        }
    )
)
