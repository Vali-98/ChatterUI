import { AppSettings } from '@lib/constants/GlobalValues'
import { Logger } from '@lib/state/Logger'
import { mmkv } from '@lib/storage/MMKV'

import { updateSwipe } from './actions'
import { db } from './db'
import { useGenerationState } from './generationState'
import { notifyGenerationComplete } from './notifications'
import { useChatState } from './state'

type FinishOptions = {
    generationId?: number
    notify?: boolean
    onSaved?: () => Promise<void>
}

// Error and close callbacks can race. They must share the same save, not start another.
let finishing: { generationId: number; promise: Promise<void> } | undefined

export const finishGeneration = (options: FinishOptions = {}): Promise<void> => {
    const state = useGenerationState.getState()
    const generationId = options.generationId ?? state.generationId
    if (!state.isGenerating || state.generationId !== generationId) return Promise.resolve()
    if (finishing?.generationId === generationId) return finishing.promise
    const promise = saveGeneration(generationId, state.currentSwipeId, options)
    finishing = { generationId: generationId, promise: promise }
    void promise.catch(() => {
        if (finishing?.promise === promise) finishing = undefined
        if (useGenerationState.getState().generationId === generationId) {
            useGenerationState.setState({ abortFunction: undefined })
        }
    })
    return promise
}

const saveGeneration = async (
    generationId: number,
    swipeId: number | undefined,
    options: FinishOptions
) => {
    const { buffer } = useChatState.getState()
    const context = swipeId === undefined ? undefined : db.query.swipeContext(swipeId)
    if (swipeId !== undefined) {
        Logger.info('Saving chat')
        await updateSwipe(swipeId, buffer.data, { timings: buffer.timings, updateFinished: true })
    }
    if (options.onSaved) {
        try {
            await options.onSaved()
        } catch (error) {
            Logger.warn(`Title generation failed: ${error}`)
        }
    }
    requestAnimationFrame(() => {
        if (useGenerationState.getState().generationId !== generationId) return
        useGenerationState.getState().reset()
        useChatState.getState().setBuffer({ data: '' })
    })
    if (options.notify !== false && context && mmkv.getBoolean(AppSettings.NotifyOnComplete)) {
        try {
            await notifyGenerationComplete({
                chatId: context.chat_id,
                characterId: context.character_id,
                characterName: context.character_name,
                text: buffer.data,
            })
        } catch (error) {
            Logger.warn(`Completion notification failed: ${error}`)
        }
    }
}

export const abortGeneration = async () => {
    const abort = useGenerationState.getState().abortFunction
    if (abort) await abort()
    else await finishGeneration({ notify: false })
}
