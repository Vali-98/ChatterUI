import { create } from 'zustand'

type AbortGeneration = () => void | Promise<void>

type GenerationState = {
    generationId: number
    isGenerating: boolean
    currentSwipeId?: number
    abortFunction?: AbortGeneration
    startGenerating: (swipeId: number) => void
    reset: () => void
    setAbort: (abortFunction: AbortGeneration) => void
}

export const useGenerationState = create<GenerationState>((set) => ({
    generationId: 0,
    isGenerating: false,
    startGenerating: (currentSwipeId) =>
        set((state) => ({
            generationId: state.generationId + 1,
            currentSwipeId: currentSwipeId,
            isGenerating: true,
            abortFunction: undefined,
        })),
    reset: () => set({ isGenerating: false, currentSwipeId: undefined, abortFunction: undefined }),
    setAbort: (abortFunction) => set({ abortFunction }),
}))
