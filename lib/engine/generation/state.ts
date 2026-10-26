import { create } from 'zustand'

import type { CompletionTimings } from '@db/schema'

export type GenerationStatus =
    | 'preparing'
    | 'running'
    | 'saving'
    | 'completed'
    | 'failed'
    | 'cancelled'
export type Generation = {
    id: number
    chatId: number
    swipeId: number
    mode: 'local' | 'remote'
    status: GenerationStatus
    text: string
    timings?: CompletionTimings
    error?: string
    persisted: boolean
    receivedOutput: boolean
}

export const isActiveGeneration = (generation: Generation) =>
    generation.status === 'preparing' ||
    generation.status === 'running' ||
    generation.status === 'saving'

export const useGenerationState = create<{ generations: Record<number, Generation> }>(() => ({
    generations: {},
}))

let nextId = 0
export const createGeneration = (
    input: Pick<Generation, 'chatId' | 'swipeId' | 'mode' | 'text'>
) => {
    const generation: Generation = {
        ...input,
        id: ++nextId,
        status: 'preparing',
        persisted: false,
        receivedOutput: false,
    }
    useGenerationState.setState((state) => ({
        generations: {
            ...Object.fromEntries(
                Object.entries(state.generations).filter(
                    ([, item]) => item.swipeId !== input.swipeId || isActiveGeneration(item)
                )
            ),
            [generation.id]: generation,
        },
    }))
    return generation
}

export const updateGeneration = (
    id: number,
    changes: Partial<Omit<Generation, 'id' | 'chatId' | 'swipeId' | 'mode'>>
) => {
    useGenerationState.setState((state) => {
        const generation = state.generations[id]
        if (!generation) return state
        return { generations: { ...state.generations, [id]: { ...generation, ...changes } } }
    })
}

export const appendGeneration = (id: number, text: string) => {
    const generation = useGenerationState.getState().generations[id]
    if (generation && isActiveGeneration(generation))
        updateGeneration(id, { text: generation.text + text, receivedOutput: true })
}

export const generationForChat = (chatId?: number) =>
    Object.values(useGenerationState.getState().generations).find(
        (item) => item.chatId === chatId && isActiveGeneration(item)
    )

// Persistence advances database observers before releasing this transient output.
export const removeGenerationOutput = (id: number) => {
    useGenerationState.setState((state) => {
        const generations = { ...state.generations }
        delete generations[id]
        return { generations }
    })
}

export const attachGenerationSwipe = (id: number, swipeId: number) => {
    useGenerationState.setState((state) => {
        const generation = state.generations[id]
        return generation
            ? { generations: { ...state.generations, [id]: { ...generation, swipeId } } }
            : state
    })
}
