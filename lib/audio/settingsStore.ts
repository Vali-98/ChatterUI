import { create } from 'zustand'
import { persist } from 'zustand/middleware'

import { Storage } from '@lib/constants/storageKeys'
import { createMMKVStorage } from '@lib/storage/MMKV'

type AudioSettings = {
    globalPlayer: boolean
    keepPlayerOpen: boolean
    setGlobalPlayer: (value: boolean) => void
    setKeepPlayerOpen: (value: boolean) => void
}
export const useAudioSettingsStore = create<AudioSettings>()(
    persist(
        (set) => ({
            globalPlayer: true,
            keepPlayerOpen: false,
            setGlobalPlayer: (globalPlayer) => set({ globalPlayer }),
            setKeepPlayerOpen: (keepPlayerOpen) => set({ keepPlayerOpen }),
        }),
        {
            name: Storage.AudioSettings,
            version: 1,
            storage: createMMKVStorage(),
            partialize: ({ globalPlayer, keepPlayerOpen }) => ({ globalPlayer, keepPlayerOpen }),
        }
    )
)
