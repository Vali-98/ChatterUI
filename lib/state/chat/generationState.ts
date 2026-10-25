import { create } from 'zustand'

type AbortGeneration = () => void | Promise<void>

type GenerationState = {
    isGenerating: boolean
    currentSwipeId?: number
    abortFunction?: AbortGeneration
    startGenerating: (swipeId: number) => void
    reset: () => void
    setAbort: (abortFunction: AbortGeneration) => void
}

export const useGenerationState = create<GenerationState>((set) => ({
    isGenerating: false,
    startGenerating: (currentSwipeId) =>
        set({ currentSwipeId: currentSwipeId, isGenerating: true, abortFunction: undefined }),
    reset: () => set({ isGenerating: false, currentSwipeId: undefined, abortFunction: undefined }),
    setAbort: (abortFunction) => set({ abortFunction }),
}))
