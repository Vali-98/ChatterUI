import {
    isActiveGeneration,
    useGenerationState,
    type Generation,
} from '@lib/engine/generation/state'
import { Chats } from '@lib/state/chat'
import { Logger } from '@lib/state/Logger'

import {
    enforceTTSPlaybackScope,
    appendTTSText,
    finishTTSSource,
    startTTSSession,
    stopTTS,
} from './player'
import { useTTSSettingsStore } from './settingsStore'
import { isTTSActive, updateTTSSession, useTTSState } from './state'

// One application-level observer. Chat selection controls automatic eligibility, not attached playback.
const createGenerationObserver = () => {
    const seen = new Set(Object.keys(useGenerationState.getState().generations).map(Number))
    const liveHandled = new Set<number>()
    const cursors = new Map<number, number>()
    const sourceFor = (generation: Generation) => {
        const swipe = generation.swipeId > 0 ? Chats.db.query.swipe(generation.swipeId) : undefined
        const context = swipe ? Chats.db.query.swipeContext(swipe.id) : undefined
        return {
            chatId: generation.chatId,
            generationId: generation.id,
            swipeId: swipe?.id,
            messageId: swipe?.entry_id,
            name: context?.character_name,
        }
    }
    const unsubscribe = useGenerationState.subscribe((state, previous) => {
        try {
            for (const generation of Object.values(state.generations)) {
                const settings = useTTSSettingsStore.getState()
                const eligible =
                    settings.enabled && generation.chatId === Chats.useChatState.getState().id
                if (!seen.has(generation.id)) {
                    seen.add(generation.id)
                    cursors.set(generation.id, generation.text.length)
                    if (
                        eligible &&
                        settings.liveTTS &&
                        !isTTSActive(useTTSState.getState().session) &&
                        isActiveGeneration(generation)
                    ) {
                        const sessionId = startTTSSession(
                            { ...sourceFor(generation), kind: 'live' },
                            { automatic: true, initialText: generation.text }
                        )
                        if (sessionId !== undefined) liveHandled.add(generation.id)
                    }
                }
                const session = useTTSState.getState().session
                if (
                    session?.kind === 'live' &&
                    session.generationId === generation.id &&
                    !session.sourceFinished
                ) {
                    if (session.swipeId === undefined && generation.swipeId > 0)
                        updateTTSSession(session.id, sourceFor(generation))
                    const cursor = cursors.get(generation.id) ?? generation.text.length
                    if (generation.text.length > cursor)
                        appendTTSText(session.id, generation.text.slice(cursor))
                    cursors.set(generation.id, generation.text.length)
                    if (generation.status === 'saving' || !isActiveGeneration(generation))
                        finishTTSSource(session.id)
                }
                if (
                    eligible &&
                    settings.auto &&
                    !isTTSActive(useTTSState.getState().session) &&
                    !settings.liveTTS &&
                    generation.status === 'completed' &&
                    generation.persisted &&
                    generation.receivedOutput &&
                    !liveHandled.has(generation.id) &&
                    previous.generations[generation.id]?.status !== 'completed'
                ) {
                    const id = startTTSSession(
                        { ...sourceFor(generation), kind: 'completion' },
                        { automatic: true }
                    )
                    if (id !== undefined) {
                        appendTTSText(id, generation.text)
                        finishTTSSource(id)
                    }
                }
            }
            for (const id of seen)
                if (!state.generations[id]) {
                    const session = useTTSState.getState().session
                    if (session?.generationId === id && !session.sourceFinished)
                        finishTTSSource(session.id)
                    seen.delete(id)
                    cursors.delete(id)
                    liveHandled.delete(id)
                }
        } catch (error) {
            // An optional speech consumer must never fail the generation-state mutation.
            Logger.stackTrace(error)
            void stopTTS()
        }
    })
    const unsubscribeSettings = useTTSSettingsStore.subscribe((settings, previous) => {
        if (previous.enabled && !settings.enabled) void stopTTS()
        if (previous.globalPlayer && !settings.globalPlayer) enforceTTSPlaybackScope()
        if (
            previous.keepPlayerOpen &&
            !settings.keepPlayerOpen &&
            useTTSState.getState().session?.status === 'finished'
        )
            void stopTTS()
    })
    return () => {
        unsubscribe()
        unsubscribeSettings()
    }
}

let observers = 0
let stopObserving: (() => void) | undefined
export const observeGenerationTTS = () => {
    observers++
    stopObserving ??= createGenerationObserver()
    let released = false
    return () => {
        if (released) return
        released = true
        if (--observers === 0) {
            stopObserving?.()
            stopObserving = undefined
        }
    }
}
