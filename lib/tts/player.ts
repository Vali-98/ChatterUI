import * as Speech from 'expo-speech'
import { t } from 'i18next'

import { Logger } from '@lib/state/Logger'

import { useTTSSettingsStore } from './settingsStore'
import { createSpeechTextStream } from './speechText'
import { isTTSActive, updateTTSSession, useTTSState, type TTSSource } from './state'

type Playback = {
    id: number
    voice: Speech.Voice
    rate: number
    queue: string[]
    replayChunks: string[]
    playing: boolean
    utteranceId: number
    filter: ReturnType<typeof createSpeechTextStream>
}
let chatVisible = false
let nextSessionId = 0
let playback: Playback | undefined
let stopping: Promise<void> = Promise.resolve()

export const stopTTS = () => {
    playback = undefined
    useTTSState.setState({ session: undefined })
    // A later start must wait until the previous native queue has actually been cleared.
    stopping = stopping.then(() => Speech.stop()).catch(Logger.stackTrace)
    return stopping
}
export const enforceTTSPlaybackScope = () => {
    const session = useTTSState.getState().session
    if (
        session &&
        session.kind !== 'preview' &&
        !chatVisible &&
        !useTTSSettingsStore.getState().globalPlayer
    )
        void stopTTS()
}
export const setTTSChatVisible = (visible: boolean) => {
    chatVisible = visible
    enforceTTSPlaybackScope()
}
const current = (id: number) => playback?.id === id && useTTSState.getState().session?.id === id
const fail = (id: number, error: unknown) => {
    if (!current(id)) return
    playback = undefined
    updateTTSSession(id, {
        status: 'failed',
        queuedChunks: 0,
        sourceFinished: true,
        error: String(error),
    })
    Logger.errorToast(t('tts.playbackFailed'), error)
}
const pump = (id: number) => {
    const active = playback
    if (!active || !current(id) || active.playing) return
    const text = active.queue.shift()
    if (!text) {
        const finished = useTTSState.getState().session?.sourceFinished
        updateTTSSession(id, { status: finished ? 'finished' : 'waiting', queuedChunks: 0 })
        if (
            finished &&
            current(id) &&
            (!useTTSSettingsStore.getState().keepPlayerOpen || active.replayChunks.length === 0)
        ) {
            playback = undefined
            useTTSState.setState({ session: undefined })
        }
        return
    }
    active.playing = true
    const utteranceId = ++active.utteranceId
    const valid = () => current(id) && active.playing && active.utteranceId === utteranceId
    updateTTSSession(id, { status: 'speaking', queuedChunks: active.queue.length })
    try {
        Speech.speak(text, {
            voice: active.voice.identifier,
            language: active.voice.language,
            rate: active.rate,
            onDone: () => {
                if (!valid()) return
                active.playing = false
                const spoken = useTTSState.getState().session?.spokenCharacters ?? 0
                updateTTSSession(id, { spokenCharacters: spoken + text.length })
                pump(id)
            },
            onStopped: () => {
                if (!valid()) return
                active.playing = false
                active.queue = []
                playback = undefined
                useTTSState.setState({ session: undefined })
            },
            onError: (error) => {
                if (valid()) fail(id, error)
            },
        })
    } catch (error) {
        fail(id, error)
    }
}

export const startTTSSession = (
    source: TTSSource,
    options: { automatic: boolean; allowDisabled?: boolean; initialText?: string }
) => {
    const settings = useTTSSettingsStore.getState()
    if (
        (!settings.enabled && !options.allowDisabled) ||
        (!settings.globalPlayer && !chatVisible && source.kind !== 'preview') ||
        (options.automatic && isTTSActive(useTTSState.getState().session))
    )
        return
    if (!settings.voice) {
        Logger.warnToast(t('tts.nospeaker'))
        return
    }
    if (!options.automatic) void stopTTS()
    const id = ++nextSessionId
    playback = {
        id: id,
        voice: settings.voice,
        rate: settings.rate,
        queue: [],
        replayChunks: [],
        playing: false,
        utteranceId: 0,
        filter: createSpeechTextStream(
            Math.max(2, Math.min(Speech.maxSpeechInputLength || 4000, 1000))
        ),
    }
    if (options.initialText) playback.filter.prime(options.initialText)
    useTTSState.setState({
        session: {
            ...source,
            id: id,
            status: 'waiting',
            sourceFinished: false,
            queuedChunks: 0,
            spokenCharacters: 0,
        },
    })
    void stopping.then(() => {
        if (current(id)) pump(id)
    })
    return id
}
export const appendTTSText = (id: number, text: string) => {
    if (!current(id) || useTTSState.getState().session?.sourceFinished) return
    const chunks = playback!.filter.push(text)
    playback!.queue.push(...chunks)
    playback!.replayChunks.push(...chunks)
    updateTTSSession(id, { queuedChunks: playback!.queue.length })
    void stopping.then(() => {
        if (current(id)) pump(id)
    })
}
export const finishTTSSource = (id: number) => {
    if (!current(id) || useTTSState.getState().session?.sourceFinished) return
    const chunks = playback!.filter.finish()
    playback!.queue.push(...chunks)
    playback!.replayChunks.push(...chunks)
    updateTTSSession(id, { sourceFinished: true, queuedChunks: playback!.queue.length })
    void stopping.then(() => {
        if (current(id)) pump(id)
    })
}

// Reuse the exact filtered text, voice and rate from this session, including live-only output.
export const replayTTS = () => {
    const active = playback
    const session = useTTSState.getState().session
    if (!active || session?.id !== active.id || session.status !== 'finished') return
    active.queue = [...active.replayChunks]
    updateTTSSession(active.id, {
        status: 'waiting',
        queuedChunks: active.queue.length,
        spokenCharacters: 0,
    })
    void stopping.then(() => {
        if (current(active.id)) pump(active.id)
    })
}
