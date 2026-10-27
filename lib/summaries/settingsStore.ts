import { create } from 'zustand'
import { persist } from 'zustand/middleware'

import { Storage } from '@lib/enums/Storage'
import { createMMKVStorage } from '@lib/storage/MMKV'

export const defaultSummarizerPrompt =
    'Summarize this conversation as factual memory for continuing it. Preserve important events, decisions, relationships, names, unresolved questions, and relevant details. Do not invent information. Infer image contents only from the surrounding text. Return only the summary.'

export type SummarySettings = {
    enabled: boolean
    autoContinueDrafts: boolean
    autoGenerate: boolean
    autoThreshold: number
    maxOutputTokens: number
    warnOnSourceChanges: boolean
    prompt: string
}

export const useSummarySettingsStore = create<
    SummarySettings & {
        update: (changes: Partial<SummarySettings>) => void
    }
>()(
    persist(
        (set) => ({
            enabled: true,
            autoContinueDrafts: false,
            autoGenerate: false,
            autoThreshold: 80,
            maxOutputTokens: 1024,
            warnOnSourceChanges: true,
            prompt: defaultSummarizerPrompt,
            update: (changes) => set(changes),
        }),
        { name: Storage.SummarySettings, storage: createMMKVStorage() }
    )
)
