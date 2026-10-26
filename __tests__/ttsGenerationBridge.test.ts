import { Chats } from '../lib/state/chat'
import * as Speech from 'expo-speech'

import {
    appendGeneration,
    attachGenerationSwipe,
    createGeneration,
    removeGenerationOutput,
    updateGeneration,
    useGenerationState,
} from '../lib/engine/generation/state'
import { useChatState } from '../lib/state/chat/state'
import { observeGenerationTTS } from '../lib/tts/generationBridge'
import { appendTTSText, finishTTSSource, startTTSSession, stopTTS } from '../lib/tts/player'
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
jest.mock('../lib/state/chat', () => ({
    Chats: {
        useChatState: require('../lib/state/chat/state').useChatState,
        db: {
            query: {
                swipe: (id: number) => ({ id, entry_id: id + 10 }),
                swipeContext: () => ({ character_name: 'Character' }),
            },
        },
    },
}))
const tick = async () => {
    for (let i = 0; i < 15; i++) await Promise.resolve()
}
let unsubscribe: () => void
beforeEach(async () => {
    await stopTTS()
    jest.clearAllMocks()
    useGenerationState.setState({ generations: {} })
    useChatState.getState().setChat(1)
    useTTSSettingsStore.setState({
        enabled: true,
        auto: false,
        liveTTS: true,
        voice: { identifier: 'voice', language: 'en-US' } as Speech.Voice,
    })
    unsubscribe = observeGenerationTTS()
})
afterEach(async () => {
    unsubscribe()
    await stopTTS()
})

test('live playback follows its generation across navigation and ignores other chats', async () => {
    const first = createGeneration({ chatId: 1, swipeId: 1, mode: 'remote', text: '' })
    const session = useTTSState.getState().session!
    useChatState.getState().setChat(2)
    const second = createGeneration({ chatId: 2, swipeId: 2, mode: 'remote', text: '' })
    appendGeneration(second.id, 'Other chat. ')
    appendGeneration(first.id, 'Original chat. ')
    await tick()
    expect(useTTSState.getState().session?.id).toBe(session.id)
    expect(jest.mocked(Speech.speak).mock.calls.map(([text]) => text)).toEqual(['Original chat.'])
    expect(useGenerationState.getState().generations[second.id].text).toBe('Other chat. ')
})

test('continuation skips the existing response while preserving an open reasoning filter', async () => {
    const generation = createGeneration({
        chatId: 1,
        swipeId: 1,
        mode: 'local',
        text: 'Old answer. <think>old reasoning',
    })
    appendGeneration(generation.id, ' more secret. </think>New answer. ')
    await tick()
    expect(jest.mocked(Speech.speak).mock.calls.map(([text]) => text)).toEqual(['New answer.'])
})

test('a provisional generation gains a jump target when its swipe is assigned', () => {
    const generation = createGeneration({ chatId: 1, swipeId: -1, mode: 'remote', text: '' })
    expect(useTTSState.getState().session?.messageId).toBeUndefined()
    attachGenerationSwipe(generation.id, 5)
    expect(useTTSState.getState().session).toMatchObject({ swipeId: 5, messageId: 15 })
})

test('stopping live playback prevents reattachment and end-of-generation replay', async () => {
    const generation = createGeneration({ chatId: 1, swipeId: 1, mode: 'remote', text: '' })
    await stopTTS()
    appendGeneration(generation.id, 'Do not speak. ')
    useTTSSettingsStore.setState({ liveTTS: false, auto: true })
    updateGeneration(generation.id, { status: 'completed', persisted: true })
    await tick()
    expect(Speech.speak).not.toHaveBeenCalled()
    expect(useTTSState.getState().session).toBeUndefined()
})

test('completion mode speaks the completed response when its chat remains loaded, without a mounted chat screen', async () => {
    useTTSSettingsStore.setState({ liveTTS: false, auto: true })
    const generation = createGeneration({ chatId: 1, swipeId: 1, mode: 'remote', text: '' })
    appendGeneration(generation.id, 'Completed response')
    expect(Speech.speak).not.toHaveBeenCalled()
    updateGeneration(generation.id, { status: 'completed', persisted: true })
    removeGenerationOutput(generation.id)
    await tick()
    expect(jest.mocked(Speech.speak).mock.calls[0][0]).toBe('Completed response')
})

test('completion mode skips an unselected chat or occupied manual player', async () => {
    useTTSSettingsStore.setState({ liveTTS: false, auto: true })
    const generation = createGeneration({ chatId: 1, swipeId: 1, mode: 'remote', text: '' })
    appendGeneration(generation.id, 'Old chat. ')
    useChatState.getState().setChat(2)
    updateGeneration(generation.id, { status: 'completed', persisted: true })
    await tick()
    expect(Speech.speak).not.toHaveBeenCalled()
    const id = startTTSSession({ kind: 'manual', chatId: 1, swipeId: 1 }, { automatic: false })!
    appendTTSText(id, 'Manual reading')
    finishTTSSource(id)
    const next = createGeneration({ chatId: 2, swipeId: 2, mode: 'remote', text: '' })
    appendGeneration(next.id, 'Automatic reading')
    updateGeneration(next.id, { status: 'completed', persisted: true })
    await tick()
    expect(jest.mocked(Speech.speak).mock.calls.map(([text]) => text)).toEqual(['Manual reading'])
})

test('disabling speech stops the player without cancelling inference', async () => {
    const generation = createGeneration({ chatId: 1, swipeId: 1, mode: 'remote', text: '' })
    useTTSSettingsStore.getState().setEnabled(false)
    await tick()
    expect(useTTSState.getState().session).toBeUndefined()
    expect(useGenerationState.getState().generations[generation.id].status).toBe('preparing')
})

test('live completion flushes the final fragment before state cleanup', async () => {
    const generation = createGeneration({ chatId: 1, swipeId: 1, mode: 'remote', text: '' })
    appendGeneration(generation.id, 'Final fragment')
    updateGeneration(generation.id, { status: 'saving' })
    removeGenerationOutput(generation.id)
    await tick()
    expect(jest.mocked(Speech.speak).mock.calls[0][0]).toBe('Final fragment')
    expect(useTTSState.getState().session?.sourceFinished).toBe(true)
})

test('multiple registrations still use one generation subscription', async () => {
    const secondObserver = observeGenerationTTS()
    const generation = createGeneration({ chatId: 1, swipeId: 1, mode: 'remote', text: '' })
    appendGeneration(generation.id, 'Speak once. ')
    updateGeneration(generation.id, { status: 'saving' })
    await tick()
    jest.mocked(Speech.speak).mock.calls[0][1]!.onDone!()
    expect(Speech.speak).toHaveBeenCalledTimes(1)
    secondObserver()
})

test('speech integration failures cannot fail a generation-state mutation', async () => {
    const query = jest.spyOn(Chats.db.query, 'swipe').mockImplementationOnce(() => {
        throw new Error('speech lookup failed')
    })
    try {
        expect(() =>
            createGeneration({ chatId: 1, swipeId: 1, mode: 'remote', text: '' })
        ).not.toThrow()
        expect(Object.values(useGenerationState.getState().generations)).toHaveLength(1)
        await tick()
    } finally {
        query.mockRestore()
    }
})
