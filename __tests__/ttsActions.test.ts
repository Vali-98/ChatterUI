import * as Speech from 'expo-speech'
import { router } from 'expo-router'

import { Characters } from '../lib/state/characters'
import { Chats } from '../lib/state/chat'
import { Logger } from '../lib/state/Logger'
import { jumpToTTSSource, previewSpeech, speakMessage } from '../lib/tts/actions'
import { stopTTS } from '../lib/tts/player'
import { useTTSSettingsStore } from '../lib/tts/settingsStore'
import { useTTSState } from '../lib/tts/state'

jest.mock('expo-speech', () => ({
    speak: jest.fn(),
    stop: jest.fn(async () => {}),
    maxSpeechInputLength: 1000,
}))
jest.mock('expo-router', () => ({ router: { navigate: jest.fn() } }))
jest.mock('i18next', () => ({ t: (key: string) => key }))
jest.mock('../lib/state/Logger', () => ({
    Logger: { errorToast: jest.fn(), warnToast: jest.fn(), stackTrace: jest.fn() },
}))
jest.mock('../lib/storage/MMKV', () => ({
    createMMKVStorage: () => ({ getItem: () => null, setItem: jest.fn(), removeItem: jest.fn() }),
}))
jest.mock('../lib/state/characters', () => ({
    Characters: { useCharacterState: { getState: () => ({ setCard: jest.fn(async () => {}) }) } },
}))
jest.mock('../lib/state/chat', () => ({
    Chats: {
        db: {
            query: { swipe: jest.fn(), swipeContext: jest.fn(), chatRow: jest.fn() },
            live: { messageIds: jest.fn() },
        },
        actions: { loadChat: jest.fn(async () => true) },
        useChatState: require('../lib/state/chat/state').useChatState,
    },
}))
const tick = async () => {
    for (let i = 0; i < 12; i++) await Promise.resolve()
}
beforeEach(async () => {
    await stopTTS()
    jest.clearAllMocks()
    useTTSSettingsStore.setState({
        enabled: true,
        voice: { identifier: 'voice', language: 'en-US' } as Speech.Voice,
    })
    jest.mocked(Chats.db.query.swipe).mockReturnValue({
        id: 5,
        entry_id: 10,
        swipe: 'Read this.',
    } as any)
    jest.mocked(Chats.db.query.swipeContext).mockReturnValue({
        chat_id: 1,
        character_name: 'Source character',
    } as any)
    jest.mocked(Chats.db.query.chatRow).mockReturnValue({ character_id: 7 } as any)
    jest.mocked(Chats.db.live.messageIds).mockReturnValue({ sync: () => [{ id: 10 }] } as any)
})
afterEach(async () => {
    await stopTTS()
})

test('manual speech uses the source swipe and its owning chat', async () => {
    Chats.useChatState.getState().setChat(99)
    speakMessage(5)
    await tick()
    expect(useTTSState.getState().session).toMatchObject({
        kind: 'manual',
        chatId: 1,
        messageId: 10,
        swipeId: 5,
    })
    expect(jest.mocked(Speech.speak).mock.calls[0][0]).toBe('Read this.')
})

test('jumping to a source supports the newest message and repeated jumps in the same chat', async () => {
    speakMessage(5)
    await jumpToTTSSource()
    expect(Chats.useChatState.getState()).toMatchObject({
        id: 1,
        scrollData: { cause: 'search', index: 0 },
    })
    const first = Chats.useChatState.getState().scrollData
    await jumpToTTSSource()
    expect(Chats.useChatState.getState().scrollData).not.toBe(first)
    expect(router.navigate).toHaveBeenCalledWith('/chat')
    expect(useTTSState.getState().session?.swipeId).toBe(5)
})

test('deleted sources do not trigger navigation', async () => {
    speakMessage(5)
    jest.mocked(Chats.db.query.chatRow).mockReturnValue(undefined)
    await jumpToTTSSource()
    expect(router.navigate).not.toHaveBeenCalled()
    expect(Logger.warnToast).toHaveBeenCalledWith('tts.sourceUnavailable')
})

test('voice preview uses the same player even when automatic speech is disabled', async () => {
    useTTSSettingsStore.setState({ enabled: false })
    previewSpeech('Preview voice.')
    await tick()
    expect(useTTSState.getState().session?.kind).toBe('preview')
    expect(jest.mocked(Speech.speak).mock.calls[0][0]).toBe('Preview voice.')
})

test('an explicit jump still completes when playback finishes during chat loading', async () => {
    speakMessage(5)
    jest.mocked(Chats.actions.loadChat).mockImplementationOnce(async () => {
        await stopTTS()
        return true
    })
    await jumpToTTSSource()
    expect(useTTSState.getState().session).toBeUndefined()
    expect(router.navigate).toHaveBeenCalledWith('/chat')
    expect(Chats.useChatState.getState().scrollData).toMatchObject({ cause: 'search', index: 0 })
})

test('a source that fails to load does not navigate', async () => {
    speakMessage(5)
    jest.mocked(Chats.actions.loadChat).mockResolvedValueOnce(false)
    await jumpToTTSSource()
    expect(router.navigate).not.toHaveBeenCalled()
})
