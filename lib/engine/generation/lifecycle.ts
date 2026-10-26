import { AppSettings } from '@lib/constants/GlobalValues'
import { publishDatabaseChanges } from '@lib/queries/databaseQuery'
import { updateSwipe } from '@lib/state/chat/actions'
import { db } from '@lib/state/chat/db'
import { notifyGenerationComplete } from '@lib/state/chat/notifications'
import { Logger } from '@lib/state/Logger'
import { mmkv } from '@lib/storage/MMKV'

import { getGenerationRuntime, releaseGenerationRuntime } from './runtime'
import { removeGenerationOutput, updateGeneration, useGenerationState } from './state'
import type { CompletionReason } from '../API/APIBuilder'

export const finishGeneration = (id: number, reason: CompletionReason): Promise<void> => {
    const generation = useGenerationState.getState().generations[id]
    if (!generation || generation.persisted) return Promise.resolve()
    const runtime = getGenerationRuntime(id)
    if (runtime.finishing) return runtime.finishing
    runtime.finishing = saveGeneration(id, reason).catch((error) => {
        runtime.finishing = undefined
        updateGeneration(id, { status: 'failed', error: String(error) })
        throw error
    })
    return runtime.finishing
}

async function saveGeneration(id: number, reason: CompletionReason) {
    const generation = useGenerationState.getState().generations[id]
    if (!generation) return
    updateGeneration(id, { status: 'saving', error: undefined })
    const runtime = getGenerationRuntime(id)
    const preserveOriginal = !generation.receivedOutput && !!runtime.originalSwipe
    const saved = preserveOriginal
        ? runtime.originalSwipe
        : await updateSwipe(generation.swipeId, generation.text, {
              ...runtime.swipeChanges,
              mutationToken: runtime.mutationToken,
              tokenizer: runtime.inputs?.tokenizer,
              timings: generation.timings,
              updateFinished: true,
          })
    // Advance every affected query snapshot before removing the transient output. No mounted
    // component, render timing, or text comparison participates in this handoff.
    publishDatabaseChanges([
        { table: 'chat_swipes', rowId: generation.swipeId },
        { table: 'chats', rowId: generation.chatId },
    ])
    updateGeneration(id, { status: saved ? reason : 'cancelled', persisted: true })
    removeGenerationOutput(id)
    releaseGenerationRuntime(id)
    const context = db.query.swipeContext(generation.swipeId)
    if (
        saved &&
        !preserveOriginal &&
        reason === 'completed' &&
        context &&
        mmkv.getBoolean(AppSettings.NotifyOnComplete)
    ) {
        try {
            await notifyGenerationComplete({
                chatId: context.chat_id,
                characterId: context.character_id,
                characterName: context.character_name,
                text: generation.text,
            })
        } catch (error) {
            Logger.warn(`Completion notification failed: ${error}`)
        }
    }
}
