import type { ChatSwipe } from '@db/schema'
import { acquireChatLease, releaseChatLease } from '@lib/state/chat/access'

import type { GenerationInputs } from './inputs'
import { canStartGeneration } from './scheduler'
import { createGeneration, generationForChat } from './state'

export type GenerationRuntime = {
    chatId: number
    mutationToken: symbol
    originalSwipe?: ChatSwipe
    swipeChanges?: {
        startedAt?: Date
        resetLength?: number | null
        resetReasoningLength?: number | null
        resetTimings?: boolean
    }
    done: Promise<void>
    resolve: () => void
    inputs?: GenerationInputs
    controller: AbortController
    abortLocal?: () => void | Promise<void>
    finishing?: Promise<void>
}
const runtimes = new Map<number, GenerationRuntime>()
export const beginGeneration = (input: Parameters<typeof createGeneration>[0]) => {
    if (!canStartGeneration(input.chatId, input.mode)) return undefined
    const mutationToken = acquireChatLease(input.chatId)
    const generation = createGeneration(input)
    let resolve!: () => void
    const done = new Promise<void>((complete) => {
        resolve = complete
    })
    runtimes.set(generation.id, {
        chatId: input.chatId,
        mutationToken: mutationToken,
        controller: new AbortController(),
        done: done,
        resolve: resolve,
    })
    return generation
}
export const getGenerationRuntime = (id: number) => {
    const runtime = runtimes.get(id)
    if (!runtime) throw new Error(`Generation ${id} has no runtime`)
    return runtime
}
export const releaseGenerationRuntime = (id: number) => {
    const runtime = runtimes.get(id)
    if (runtime) releaseChatLease(runtime.chatId, runtime.mutationToken)
    runtime?.resolve()
    runtimes.delete(id)
}
export const abortGeneration = async (chatId: number) => {
    const generation = generationForChat(chatId)
    if (!generation) return
    const runtime = getGenerationRuntime(generation.id)
    runtime.controller.abort()
    await runtime.abortLocal?.()
}
