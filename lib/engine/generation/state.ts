import { create } from 'zustand'

import type { CompletionTimings } from '@db/schema'
import { createReasoningParser } from '@lib/engine/reasoning/parser'

export type GenerationStatus =
    | 'preparing'
    | 'summarizing'
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
    reasoning: string
    timings?: CompletionTimings
    error?: string
    persisted: boolean
    receivedOutput: boolean
}

export const isActiveGeneration = (generation: Generation) =>
    generation.status === 'preparing' ||
    generation.status === 'summarizing' ||
    generation.status === 'running' ||
    generation.status === 'saving'

export const useGenerationState = create<{ generations: Record<number, Generation> }>(() => ({
    generations: {},
}))

const parsers = new Map<number, ReturnType<typeof createReasoningParser>>()
let nextId = 0
export const createGeneration = (
    input: Pick<Generation, 'chatId' | 'swipeId' | 'mode' | 'text'> & { reasoning?: string }
) => {
    const generation: Generation = {
        ...input,
        reasoning: input.reasoning ?? '',
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

export const appendGeneration = (id: number, text: string, type: 'text' | 'reasoning' = 'text') => {
    const generation = useGenerationState.getState().generations[id]
    if (!generation || !isActiveGeneration(generation) || generation.status === 'saving') return
    const output =
        type === 'reasoning'
            ? { text: '', reasoning: text }
            : (parsers.get(id)?.push(text) ?? { text: text, reasoning: '' })
    updateGeneration(id, {
        text: generation.text + output.text,
        reasoning: generation.reasoning + output.reasoning,
        receivedOutput:
            generation.receivedOutput || output.text.length > 0 || output.reasoning.length > 0,
    })
}

export const enableGenerationInlineReasoning = (id: number) => {
    if (!parsers.has(id)) parsers.set(id, createReasoningParser())
}
export const primeGenerationReasoning = (id: number, endTag: string) => {
    enableGenerationInlineReasoning(id)
    parsers.get(id)!.startReasoning(endTag)
}

export const flushGenerationContent = (id: number) => {
    const output = parsers.get(id)?.finish()
    const generation = useGenerationState.getState().generations[id]
    if (output && generation && (output.text || output.reasoning))
        updateGeneration(id, {
            text: generation.text + output.text,
            reasoning: generation.reasoning + output.reasoning,
            receivedOutput: true,
        })
    parsers.delete(id)
}

export const generationForChat = (chatId?: number) =>
    Object.values(useGenerationState.getState().generations).find(
        (item) => item.chatId === chatId && isActiveGeneration(item)
    )

// Persistence advances database observers before releasing this transient output.
export const removeGenerationOutput = (id: number) => {
    parsers.delete(id)
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
