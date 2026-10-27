import { createAudioPlayer, setAudioModeAsync, type AudioStatus } from 'expo-audio'
import { t } from 'i18next'

import { Logger } from '@lib/state/Logger'
import { stopTTS } from '@lib/tts/player'
import { useTTSState } from '@lib/tts/state'

import { useAudioSettingsStore } from './settingsStore'
import { isAudioActive, useAudioState, type AudioSource, type AudioSession } from './state'

type Player = ReturnType<typeof createAudioPlayer>
let playback: { id: number; player: Player; unsubscribe: () => void } | undefined
let wantsToPlay = false
let dismissTimer: ReturnType<typeof setTimeout> | undefined
const cancelDismiss = () => {
    clearTimeout(dismissTimer)
    dismissTimer = undefined
}
let nextId = 0
let visibleChatId: number | undefined

const current = (id: number) => useAudioState.getState().session?.id === id
const update = (id: number, fields: Partial<AudioSession>) => {
    useAudioState.setState((state) => {
        if (state.session?.id !== id) return state
        if (
            Object.entries(fields).every(([key, value]) =>
                Object.is(state.session![key as keyof AudioSession], value)
            )
        )
            return state
        return { session: { ...state.session, ...fields } }
    })
}
const disposePlayer = () => {
    const active = playback
    playback = undefined
    if (!active) return
    active.unsubscribe()
    try {
        active.player.clearLockScreenControls()
        active.player.pause()
    } catch (error) {
        Logger.stackTrace(error)
    } finally {
        active.player.remove()
    }
}
export const stopAudio = () => {
    cancelDismiss()
    wantsToPlay = false
    useAudioState.setState({ session: undefined })
    disposePlayer()
}
export const stopAudioSource = (uri: string) => {
    if (useAudioState.getState().session?.uri === uri) stopAudio()
}
const fail = (id: number, error: unknown) => {
    if (!current(id)) return
    disposePlayer()
    update(id, { status: 'failed', error: String(error) })
    Logger.errorToast(t('audio.playbackFailed'), error)
}
const onStatus = (id: number, status: AudioStatus) => {
    const session = useAudioState.getState().session
    if (session?.id !== id) return
    if (status.error) {
        fail(id, status.error)
        return
    }
    if (status.didJustFinish) {
        if (session.status === 'finished') return
        playback?.player.clearLockScreenControls()
        update(id, {
            status: 'finished',
            currentTime: status.duration || session.duration,
            duration: status.duration || session.duration,
        })
        if (!useAudioSettingsStore.getState().keepPlayerOpen) {
            cancelDismiss()
            dismissTimer = setTimeout(() => {
                if (current(id) && useAudioState.getState().session?.status === 'finished')
                    stopAudio()
            }, 1500)
        }
        return
    }
    if (session.status === 'finished' || session.status === 'failed') return
    update(id, {
        currentTime: status.currentTime ?? session.currentTime,
        duration: status.duration ?? session.duration,
        status: status.isLoaded
            ? status.playing
                ? 'playing'
                : 'paused'
            : session.status === 'paused'
              ? 'paused'
              : 'loading',
    })
}
export const playAudio = async (source: AudioSource) => {
    if (useAudioState.getState().recording) return
    const session = useAudioState.getState().session
    if (session?.uri === source.uri && session.status !== 'failed') {
        await resumeAudio()
        return
    }
    stopAudio()
    wantsToPlay = true
    const id = ++nextId
    useAudioState.setState({
        session: { ...source, id: id, status: 'loading', currentTime: 0, duration: 0 },
    })
    try {
        await stopTTS()
        if (!current(id)) return
        await setAudioModeAsync({
            playsInSilentMode: true,
            shouldPlayInBackground: true,
            interruptionMode: 'doNotMix',
        })
        if (!current(id)) return
        const player = createAudioPlayer({ uri: source.uri }, { updateInterval: 250 })
        playback = { id: id, player: player, unsubscribe: () => {} }
        const listener = player.addListener('playbackStatusUpdate', (status) =>
            onStatus(id, status)
        )
        playback.unsubscribe = () => listener.remove()
        player.setActiveForLockScreen(true, { title: source.name })
        if (wantsToPlay) player.play()
    } catch (error) {
        fail(id, error)
    }
}
export const pauseAudio = () => {
    const session = useAudioState.getState().session
    if (!session || !isAudioActive(session)) return
    wantsToPlay = false
    try {
        playback?.player.pause()
        update(session.id, { status: 'paused' })
    } catch (error) {
        fail(session.id, error)
    }
}
export const resumeAudio = async () => {
    if (useAudioState.getState().recording) return
    const session = useAudioState.getState().session
    if (!session || session.status === 'playing') return
    if (session.status === 'failed') {
        await playAudio(session)
        return
    }
    cancelDismiss()
    const active = playback
    wantsToPlay = true
    update(session.id, { status: 'loading' })
    try {
        await stopTTS()
        if (!current(session.id) || !wantsToPlay) return
        // An initial load in progress will start playback when it creates the player.
        if (!active) return
        if (session.status === 'finished') await active.player.seekTo(0)
        if (!current(session.id) || !wantsToPlay) return
        active.player.setActiveForLockScreen(true, { title: session.name })
        active.player.play()
    } catch (error) {
        fail(session.id, error)
    }
}
export const seekAudio = async (seconds: number) => {
    const session = useAudioState.getState().session
    const active = playback
    if (!session || !active || !Number.isFinite(seconds)) return
    try {
        const position = Math.max(0, Math.min(session.duration, seconds))
        if (session.status === 'finished') {
            cancelDismiss()
            wantsToPlay = false
            update(session.id, { status: 'paused' })
        }
        await active.player.seekTo(position)
        update(session.id, { currentTime: position })
    } catch (error) {
        fail(session.id, error)
    }
}
const enforceScope = () => {
    const session = useAudioState.getState().session
    if (
        session &&
        !useAudioSettingsStore.getState().globalPlayer &&
        visibleChatId !== session.chatId
    )
        stopAudio()
}
export const setAudioChatScope = (chatId: number | undefined) => {
    visibleChatId = chatId
    enforceScope()
}
export const observeAudioPlayback = () => {
    const stopSettings = useAudioSettingsStore.subscribe((settings, previous) => {
        if (settings.keepPlayerOpen) cancelDismiss()
        if (previous.globalPlayer && !settings.globalPlayer) enforceScope()
        if (
            previous.keepPlayerOpen &&
            !settings.keepPlayerOpen &&
            useAudioState.getState().session?.status === 'finished'
        )
            stopAudio()
    })
    const stopSpeech = useTTSState.subscribe((state) => {
        const session = useAudioState.getState().session
        if (state.session && session && !isAudioActive(session)) stopAudio()
    })
    return () => {
        stopSettings()
        stopSpeech()
    }
}
