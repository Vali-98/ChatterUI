import { create } from 'zustand'

export type CharacterImportState = {
    isImporting: boolean
    total: number
    completed: number
    succeeded: number
    failed: number
}

// Keep the final counts after completion so a future progress notice can report the result.
export const useCharacterImportState = create<CharacterImportState>()(() => ({
    isImporting: false,
    total: 0,
    completed: 0,
    succeeded: 0,
    failed: 0,
}))
