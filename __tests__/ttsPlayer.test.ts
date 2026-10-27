import * as Speech from 'expo-speech'

import { useAudioState } from '../lib/audio/state'

import {
    appendTTSText,
    finishTTSSource,
    startTTSSession,
    stopTTS,
    replayTTS,
    setTTSChatVisible,
    enforceTTSPlaybackScope,
} from '../lib/tts/player'
import { useTTSSettingsStore } from '../lib/tts/settingsStore'
import { useTTSState } from '../lib/tts/state'

jest.mock('expo-speech', () => ({
    speak: jest.fn(),
    stop: jest.fn(async () => {}),
    maxSpeechInputLength: 1000,
}))
jest.mock('i18next', () => ({ t: (key: string) => key }))
jest.mock('../lib/state/Logger', () => ({
    Logger: { errorToast: jest.fn(), warnToast: jest.fn(), stackTrace: jest.fn() },
}))
jest.mock('../lib/storage/MMKV', () => ({
    createMMKVStorage: () => ({ getItem: () => null, setItem: jest.fn(), removeItem: jest.fn() }),
}))
const tick = async () => {
    for (let i = 0; i < 12; i++) await Promise.resolve()
}
const voice = {
    identifier: 'voice',
    name: 'Voice',
    language: 'en-US',
    quality: 'Default',
} as Speech.Voice
beforeEach(async () => {
    await stopTTS()
    useAudioState.setState({ session: undefined })
    useAudioState.setState({ recording: false })
    jest.clearAllMocks()
    useTTSSettingsStore.setState({
        enabled: true,
        voice,
        rate: 1,
        globalPlayer: true,
        keepPlayerOpen: false,
    })
    setTTSChatVisible(false)
})
afterEach(async () => {
    await stopTTS()
})

test('live sessions wait for text and own the queue one native utterance at a time', async () => {
    const id = startTTSSession({ kind: 'live', chatId: 1, generationId: 1 }, { automatic: true })!
    await tick()
    expect(useTTSState.getState().session?.status).toBe('waiting')
    appendTTSText(id, 'First sentence. Second sentence. ')
    await tick()
    expect(Speech.speak).toHaveBeenCalledTimes(1)
    expect(jest.mocked(Speech.speak).mock.calls[0][0]).toBe('First sentence.')
    finishTTSSource(id)
    jest.mocked(Speech.speak).mock.calls[0][1]!.onDone!()
    expect(Speech.speak).toHaveBeenCalledTimes(2)
    jest.mocked(Speech.speak).mock.calls[1][1]!.onDone!()
    expect(useTTSState.getState().session).toBeUndefined()
})

test('automatic sources cannot replace a player that is waiting or speaking', async () => {
    const id = startTTSSession({ kind: 'live', generationId: 1 }, { automatic: true })!
    expect(
        startTTSSession({ kind: 'completion', generationId: 2 }, { automatic: true })
    ).toBeUndefined()
    appendTTSText(id, 'Hello. ')
    await tick()
    expect(startTTSSession({ kind: 'live', generationId: 3 }, { automatic: true })).toBeUndefined()
    expect(useTTSState.getState().session?.generationId).toBe(1)
})

test('old callbacks cannot clear a new manual session on the same swipe', async () => {
    const first = startTTSSession({ kind: 'manual', swipeId: 5 }, { automatic: false })!
    appendTTSText(first, 'Old response')
    finishTTSSource(first)
    await tick()
    const old = jest.mocked(Speech.speak).mock.calls[0][1]!
    const second = startTTSSession({ kind: 'manual', swipeId: 5 }, { automatic: false })!
    appendTTSText(second, 'New response')
    finishTTSSource(second)
    await tick()
    old.onStopped!()
    old.onDone!()
    expect(useTTSState.getState().session).toMatchObject({ id: second, status: 'speaking' })
})

test('new playback waits for the previous native stop to settle', async () => {
    let stopped!: () => void
    jest.mocked(Speech.stop).mockImplementationOnce(
        () =>
            new Promise<void>((resolve) => {
                stopped = resolve
            })
    )
    const id = startTTSSession({ kind: 'manual' }, { automatic: false })!
    appendTTSText(id, 'Hello')
    finishTTSSource(id)
    await tick()
    expect(Speech.speak).not.toHaveBeenCalled()
    stopped()
    await tick()
    expect(Speech.speak).toHaveBeenCalledTimes(1)
})

test('stop detaches the source and late text cannot restart it', async () => {
    const id = startTTSSession({ kind: 'live' }, { automatic: true })!
    await stopTTS()
    appendTTSText(id, 'Do not speak this. ')
    finishTTSSource(id)
    await tick()
    expect(Speech.speak).not.toHaveBeenCalled()
    expect(useTTSState.getState().session).toBeUndefined()
})

test('session voice and rate stay captured while settings change', async () => {
    const id = startTTSSession({ kind: 'live' }, { automatic: true })!
    useTTSSettingsStore.setState({ rate: 2, voice: { ...voice, identifier: 'other' } })
    appendTTSText(id, 'Hello. ')
    await tick()
    expect(jest.mocked(Speech.speak).mock.calls[0][1]).toMatchObject({ rate: 1, voice: 'voice' })
})

test('retained playback replays the original filtered chunks and ignores previous utterance callbacks', async () => {
    useTTSSettingsStore.setState({ keepPlayerOpen: true })
    const id = startTTSSession({ kind: 'live', swipeId: 5 }, { automatic: true })!
    appendTTSText(id, '<think>Private reasoning.</think>First sentence. Second sentence.')
    finishTTSSource(id)
    await tick()
    const first = jest.mocked(Speech.speak).mock.calls[0][1]!
    first.onDone!()
    const second = jest.mocked(Speech.speak).mock.calls[1][1]!
    second.onDone!()
    expect(useTTSState.getState().session).toMatchObject({ id: id, status: 'finished' })
    useTTSSettingsStore.setState({ rate: 2 })
    replayTTS()
    await tick()
    first.onDone!()
    second.onStopped!()
    expect(useTTSState.getState().session?.status).toBe('speaking')
    expect(jest.mocked(Speech.speak).mock.calls[2][0]).toBe('First sentence.')
    expect(jest.mocked(Speech.speak).mock.calls[2][1]?.rate).toBe(1)
    jest.mocked(Speech.speak).mock.calls[2][1]!.onDone!()
    expect(jest.mocked(Speech.speak).mock.calls[3][0]).toBe('Second sentence.')
    jest.mocked(Speech.speak).mock.calls[3][1]!.onDone!()
    expect(useTTSState.getState().session?.status).toBe('finished')
    await stopTTS()
    replayTTS()
    await tick()
    expect(Speech.speak).toHaveBeenCalledTimes(4)
})

test('finished players do not retain ownership and empty speech is dismissed', async () => {
    useTTSSettingsStore.setState({ keepPlayerOpen: true })
    const first = startTTSSession({ kind: 'manual' }, { automatic: false })!
    appendTTSText(first, 'Hello.')
    finishTTSSource(first)
    await tick()
    jest.mocked(Speech.speak).mock.calls[0][1]!.onDone!()
    const next = startTTSSession({ kind: 'completion' }, { automatic: true })!
    expect(next).not.toBe(first)
    appendTTSText(next, '<think>Nothing audible</think>')
    finishTTSSource(next)
    await tick()
    expect(useTTSState.getState().session).toBeUndefined()
})

test('non-global playback detaches on leaving chats without reattaching on return', async () => {
    useTTSSettingsStore.setState({ globalPlayer: false })
    setTTSChatVisible(true)
    const id = startTTSSession({ kind: 'live' }, { automatic: true })!
    appendTTSText(id, 'Hello. ')
    await tick()
    setTTSChatVisible(false)
    expect(useTTSState.getState().session).toBeUndefined()
    setTTSChatVisible(true)
    appendTTSText(id, 'Late output. ')
    await tick()
    expect(Speech.speak).toHaveBeenCalledTimes(1)
})

test('chat-only scope blocks new speech outside chats but allows settings previews', async () => {
    useTTSSettingsStore.setState({ globalPlayer: false })
    expect(startTTSSession({ kind: 'completion' }, { automatic: true })).toBeUndefined()
    expect(startTTSSession({ kind: 'manual' }, { automatic: false })).toBeUndefined()
    const preview = startTTSSession({ kind: 'preview' }, { automatic: false, allowDisabled: true })!
    expect(preview).toBeDefined()
    enforceTTSPlaybackScope()
    expect(useTTSState.getState().session?.id).toBe(preview)
})

test('global playback survives leaving chats and can be detached by changing its preference', () => {
    setTTSChatVisible(true)
    const id = startTTSSession({ kind: 'live' }, { automatic: true })!
    setTTSChatVisible(false)
    expect(useTTSState.getState().session?.id).toBe(id)
    useTTSSettingsStore.setState({ globalPlayer: false })
    enforceTTSPlaybackScope()
    expect(useTTSState.getState().session).toBeUndefined()
})

test.each(['loading', 'playing', 'paused'] as const)(
    'audio %s blocks manual, automatic and preview TTS starts',
    (status) => {
        useAudioState.setState({
            session: {
                id: 1,
                uri: 'file:///audio.mp3',
                name: 'audio.mp3',
                chatId: 1,
                status,
                currentTime: 0,
                duration: 10,
            },
        })
        expect(startTTSSession({ kind: 'manual' }, { automatic: false })).toBeUndefined()
        expect(startTTSSession({ kind: 'completion' }, { automatic: true })).toBeUndefined()
        expect(
            startTTSSession({ kind: 'preview' }, { automatic: false, allowDisabled: true })
        ).toBeUndefined()
        expect(Speech.speak).not.toHaveBeenCalled()
    }
)

test('microphone recording blocks TTS even without an audio playback session', () => {
    useAudioState.setState({ recording: true })
    expect(startTTSSession({ kind: 'manual' }, { automatic: false })).toBeUndefined()
    expect(startTTSSession({ kind: 'completion' }, { automatic: true })).toBeUndefined()
})
