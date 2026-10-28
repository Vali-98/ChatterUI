import { createAudioPlayer, setAudioModeAsync, type AudioStatus } from 'expo-audio'

import {
    observeAudioPlayback,
    pauseAudio,
    playAudio,
    resumeAudio,
    seekAudio,
    setAudioChatScope,
    stopAudio,
} from '../lib/audio/player'
import { useAudioSettingsStore } from '../lib/audio/settingsStore'
import { isAudioActive, useAudioState } from '../lib/audio/state'
import { stopTTS } from '../lib/tts/player'
import { useTTSState } from '../lib/tts/state'

jest.mock('expo-audio', () => ({
    createAudioPlayer: jest.fn(),
    setAudioModeAsync: jest.fn(async () => {}),
}))
jest.mock('../lib/tts/player', () => ({ stopTTS: jest.fn(async () => {}) }))
jest.mock('i18next', () => ({ t: (key: string) => key }))
jest.mock('../lib/state/Logger', () => ({
    Logger: { errorToast: jest.fn(), stackTrace: jest.fn() },
}))
jest.mock('../lib/storage/MMKV', () => ({
    createMMKVStorage: () => ({ getItem: () => null, setItem: jest.fn(), removeItem: jest.fn() }),
}))

const source = { uri: 'file:///one.mp3', name: 'one.mp3', chatId: 1 }
const makePlayer = () => ({
    play: jest.fn(),
    pause: jest.fn(),
    seekTo: jest.fn(async () => {}),
    remove: jest.fn(),
    clearLockScreenControls: jest.fn(),
    setActiveForLockScreen: jest.fn(),
    addListener: jest.fn(() => ({ remove: jest.fn() })),
})
let players: ReturnType<typeof makePlayer>[]
const emit = (player: ReturnType<typeof makePlayer>, fields: Partial<AudioStatus>) => {
    const listener = (
        player.addListener.mock.calls[0] as unknown as [string, (status: AudioStatus) => void]
    )[1]
    listener({
        isLoaded: true,
        playing: true,
        currentTime: 5,
        duration: 30,
        didJustFinish: false,
        error: null,
        ...fields,
    } as AudioStatus)
}
beforeEach(() => {
    jest.useFakeTimers()
    stopAudio()
    useAudioState.setState({ recording: false })
    jest.clearAllMocks()
    useAudioSettingsStore.setState({ globalPlayer: true, keepPlayerOpen: false })
    useTTSState.setState({ session: undefined })
    setAudioChatScope(1)
    players = []
    jest.mocked(stopTTS).mockResolvedValue(undefined)
    jest.mocked(createAudioPlayer).mockImplementation(() => {
        const player = makePlayer()
        players.push(player)
        return player as unknown as ReturnType<typeof createAudioPlayer>
    })
})
afterEach(() => {
    stopAudio()
    jest.useRealTimers()
})

test('audio reserves ownership before awaiting TTS shutdown; pausing keeps it', async () => {
    const started = playAudio(source)
    expect(isAudioActive(useAudioState.getState().session)).toBe(true)
    await started
    expect(stopTTS).toHaveBeenCalled()
    expect(players[0].play).toHaveBeenCalled()
    emit(players[0], {})
    pauseAudio()
    expect(useAudioState.getState().session?.status).toBe('paused')
    expect(isAudioActive(useAudioState.getState().session)).toBe(true)
    await seekAudio(12)
    expect(players[0].seekTo).toHaveBeenCalledWith(12)
    await resumeAudio()
    expect(createAudioPlayer).toHaveBeenCalledTimes(1)
})

test('old pending starts and stale callbacks cannot replace or clear the newer attachment', async () => {
    let release!: () => void
    jest.mocked(stopTTS).mockReturnValueOnce(
        new Promise((resolve) => {
            release = resolve
        })
    )
    const pending = playAudio(source)
    await playAudio({ ...source, uri: 'file:///two.mp3' })
    release()
    await pending
    expect(createAudioPlayer).toHaveBeenCalledTimes(1)
    const old = players[0]
    await playAudio({ ...source, uri: 'file:///three.mp3' })
    emit(old, { didJustFinish: true })
    expect(useAudioState.getState().session?.uri).toBe('file:///three.mp3')
    expect(old.remove).toHaveBeenCalled()
})

test('stopping during preparation prevents a late native player from starting', async () => {
    let release!: () => void
    jest.mocked(setAudioModeAsync).mockReturnValueOnce(
        new Promise((resolve) => {
            release = resolve
        })
    )
    const started = playAudio(source)
    await Promise.resolve()
    stopAudio()
    release()
    await started
    expect(createAudioPlayer).not.toHaveBeenCalled()
})

test('completion dismisses by default, or retains replay without holding TTS ownership', async () => {
    await playAudio(source)
    emit(players[0], { didJustFinish: true, playing: false })
    expect(useAudioState.getState().session?.status).toBe('finished')
    jest.advanceTimersByTime(1499)
    expect(useAudioState.getState().session?.status).toBe('finished')
    jest.advanceTimersByTime(1)
    expect(useAudioState.getState().session).toBeUndefined()
    expect(players[0].remove).toHaveBeenCalled()
    useAudioSettingsStore.setState({ keepPlayerOpen: true })
    await playAudio(source)
    emit(players[1], { didJustFinish: true, playing: false })
    expect(useAudioState.getState().session?.status).toBe('finished')
    expect(isAudioActive(useAudioState.getState().session)).toBe(false)
    await resumeAudio()
    expect(players[1].seekTo).toHaveBeenCalledWith(0)
    expect(isAudioActive(useAudioState.getState().session)).toBe(true)
})

test('global playback retains a session; scoped playback stops when leaving its chat', async () => {
    const unsubscribe = observeAudioPlayback()
    try {
        await playAudio(source)
        setAudioChatScope(undefined)
        expect(useAudioState.getState().session).toBeDefined()
        useAudioSettingsStore.setState({ globalPlayer: false })
        expect(useAudioState.getState().session).toBeUndefined()
        setAudioChatScope(1)
        await playAudio(source)
        setAudioChatScope(2)
        expect(useAudioState.getState().session).toBeUndefined()
    } finally {
        unsubscribe()
    }
})

test('native playback errors release ownership and expose a retryable failure', async () => {
    await playAudio(source)
    emit(players[0], { error: 'missing file' })
    expect(useAudioState.getState().session).toMatchObject({
        status: 'failed',
        error: 'missing file',
    })
    expect(isAudioActive(useAudioState.getState().session)).toBe(false)
    expect(players[0].remove).toHaveBeenCalled()
    await resumeAudio()
    expect(players).toHaveLength(2)
})

test('a native paused status emitted while registering lock-screen controls does not cancel the requested start', async () => {
    jest.mocked(createAudioPlayer).mockImplementationOnce(() => {
        const player = makePlayer()
        player.setActiveForLockScreen.mockImplementation(() => emit(player, { playing: false }))
        players.push(player)
        return player as unknown as ReturnType<typeof createAudioPlayer>
    })
    await playAudio(source)
    expect(players[0].play).toHaveBeenCalled()
})

test('seeking after completion retains a paused session and resumes from that position', async () => {
    useAudioSettingsStore.setState({ keepPlayerOpen: true })
    await playAudio(source)
    emit(players[0], { didJustFinish: true, playing: false })
    await seekAudio(10)
    expect(useAudioState.getState().session).toMatchObject({ status: 'paused', currentTime: 10 })
    await resumeAudio()
    expect(players[0].seekTo).toHaveBeenCalledTimes(1)
    expect(players[0].seekTo).toHaveBeenCalledWith(10)
})

test('replaying or replacing a finished clip cancels its pending dismissal', async () => {
    await playAudio(source)
    emit(players[0], { didJustFinish: true, playing: false })
    await resumeAudio()
    jest.advanceTimersByTime(1500)
    expect(useAudioState.getState().session).toBeDefined()
    emit(players[0], { didJustFinish: true, playing: false })
    await playAudio({ ...source, uri: 'file:///replacement.mp3' })
    jest.advanceTimersByTime(1500)
    expect(useAudioState.getState().session?.uri).toBe('file:///replacement.mp3')
})

test('seeking preserves the pause control through transient native pause and buffering updates', async () => {
    await playAudio(source)
    const player = players[0]
    emit(player, {})
    let completeSeek!: () => void
    player.seekTo.mockImplementationOnce(
        () =>
            new Promise<void>((resolve) => {
                completeSeek = resolve
            })
    )
    const seek = seekAudio(12)
    expect(useAudioState.getState().session?.currentTime).toBe(12)
    emit(player, { playing: false, currentTime: 5 })
    expect(useAudioState.getState().session?.currentTime).toBe(12)
    expect(useAudioState.getState().session?.status).toBe('playing')
    completeSeek()
    await seek
    expect(useAudioState.getState().session?.currentTime).toBe(12)
    emit(player, { playing: false, isBuffering: true, currentTime: 12 })
    expect(useAudioState.getState().session?.status).toBe('playing')
    pauseAudio()
    emit(player, { playing: false, isBuffering: true })
    expect(useAudioState.getState().session?.status).toBe('paused')
})
