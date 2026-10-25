import { AppSettings } from '@lib/constants/GlobalValues'
import { Logger } from '@lib/state/Logger'
import { mmkv } from '@lib/storage/MMKV'

import { updateSwipe } from './actions'
import { db } from './db'
import { useGenerationState } from './generationState'
import { notifyGenerationComplete } from './notifications'
import { useChatState } from './state'

export const finishGeneration = async () => {
    const { currentSwipeId } = useGenerationState.getState()
    if (currentSwipeId === undefined) return
    const { buffer } = useChatState.getState()
    const context = db.query.swipeContext(currentSwipeId)
    Logger.info('Saving chat')
    await updateSwipe(currentSwipeId, buffer.data, {
        timings: buffer.timings,
        updateFinished: true,
    })
    requestAnimationFrame(() => {
        if (useGenerationState.getState().currentSwipeId !== currentSwipeId) return
        useGenerationState.getState().reset()
        useChatState.getState().setBuffer({ data: '' })
    })
    if (context && mmkv.getBoolean(AppSettings.NotifyOnComplete)) {
        await notifyGenerationComplete({
            chatId: context.chat_id,
            characterId: context.character_id,
            characterName: context.character_name,
            text: buffer.data,
        })
    }
}

export const abortGeneration = async () => {
    const abort = useGenerationState.getState().abortFunction
    if (abort) await abort()
    else await finishGeneration()
}
