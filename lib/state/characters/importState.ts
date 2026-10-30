import { create } from 'zustand'

export type CharacterImportState = {
    isImporting: boolean
    total: number
    completed: number
    succeeded: number
    failed: number
    noticeDismissed: boolean
    dismissNotice: () => void
}

// Keep the final counts until the result is dismissed or another import starts.
export const useCharacterImportState = create<CharacterImportState>()((set) => ({
    isImporting: false,
    total: 0,
    completed: 0,
    succeeded: 0,
    failed: 0,
    noticeDismissed: false,
    dismissNotice: () => set({ noticeDismissed: true }),
}))
