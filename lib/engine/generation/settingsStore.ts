import { create } from 'zustand'
import { persist } from 'zustand/middleware'

import { DEFAULT_CONTINUATION_PROMPT } from '@lib/constants/generation'
import { Storage } from '@lib/constants/storageKeys'
import { createMMKVStorage } from '@lib/storage/MMKV'

type GenerationSettings = {
    continuationPrompt: string
    setContinuationPrompt: (prompt: string) => void
    resetContinuationPrompt: () => void
}

export const useGenerationSettingsStore = create<GenerationSettings>()(
    persist(
        (set) => ({
            continuationPrompt: DEFAULT_CONTINUATION_PROMPT,
            setContinuationPrompt: (continuationPrompt) => set({ continuationPrompt }),
            resetContinuationPrompt: () => set({ continuationPrompt: DEFAULT_CONTINUATION_PROMPT }),
        }),
        {
            name: Storage.GenerationSettings,
            storage: createMMKVStorage(),
            partialize: ({ continuationPrompt }) => ({ continuationPrompt }),
        }
    )
)
