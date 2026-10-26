import BackgroundService from 'react-native-background-actions'

import { AppSettings } from '../lib/constants/GlobalValues'
import { buildAndSendRequest } from '../lib/engine/API/APIBuilder'
import {
    buildChatCompletionContext,
    buildTextCompletionContext,
} from '../lib/engine/API/ContextBuilder'
import { getDataSources } from '../lib/engine/DataSources'
import { continueResponse, generateResponse, regenerateResponse } from '../lib/engine/Inference'
import { Llama } from '../lib/engine/Local/LlamaLocal'
import { localInference } from '../lib/engine/LocalInference'
import { useAppModeStore } from '../lib/state/AppMode'
import { Chats, useGenerationState } from '../lib/state/chat'
import { useChatState } from '../lib/state/chat/state'
import { useTTSStore } from '../lib/state/TTS'
import { Logger } from '../lib/state/Logger'
import { mmkv } from '../lib/storage/MMKV'

jest.mock('react-native-background-actions', () => ({
    __esModule: true,
    default: { start: jest.fn() },
}))
jest.mock('i18next', () => ({ t: (key: string) => key }))
jest.mock('../app/components/views/Alert', () => ({
    __esModule: true,
    default: { alert: jest.fn() },
}))
jest.mock('../lib/engine/API/APIBuilder', () => ({ buildAndSendRequest: jest.fn() }))
jest.mock('../lib/engine/API/ContextBuilder', () => ({
    buildChatCompletionContext: jest.fn(),
    buildTextCompletionContext: jest.fn(),
}))
jest.mock('../lib/engine/API/connectionStore', () => ({
    useConnectionStore: {
        getState: () => {
            const template = require('../lib/engine/API/DefaultAPI').defaultTemplates[0]
            return {
                connections: [
                    { ...template.defaultValues, id: 'connection', configName: template.name },
                ],
                activeConnectionId: 'connection',
                getTemplates: () => [template],
            }
        },
    },
}))
jest.mock('../lib/engine/DataSources', () => ({ getDataSources: jest.fn() }))
jest.mock('../lib/engine/Tokenizer', () => ({
    Tokenizer: { getTokenizer: () => async (text: string) => text.length },
}))
jest.mock('../lib/markdown/ThinkTags', () => ({
    isOpenThinkTag: (text: string) => text.startsWith('<think>'),
    isCloseThinkTag: (text: string) => text.endsWith('</think>'),
}))
jest.mock('../lib/state/AppMode', () => ({ useAppModeStore: { getState: jest.fn() } }))
jest.mock('../lib/state/characters', () => ({
    Characters: {
        useCharacterState: { getState: () => ({ id: 1, card: { id: 1, name: 'Character' } }) },
        useUserStore: { getState: () => ({ id: 2, card: { id: 2, name: 'User' } }) },
        db: { query: { card: async () => ({ id: 1, name: 'Character' }) } },
    },
}))
jest.mock('../lib/state/characters/links', () => ({
    CharacterLinks: { db: { query: { links: async () => [] } } },
}))
jest.mock('../lib/state/characters/tokenState', () => ({
    useCharacterTokenState: { getState: () => ({ countTokens: async () => ({}) }) },
}))
jest.mock('../lib/state/Instructs', () => ({
    Instructs: {
        useInstruct: {
            getState: () => ({
                replacedMacros: () => ({}),
                getCache: async () => ({}),
                getStopSequence: () => ['STOP'],
            }),
        },
    },
    commonStopStrings: [],
    outputPrefixes: [],
}))
jest.mock('../lib/state/samplerStore', () => ({
    getCurrentSampler: () => require('../lib/constants/SamplerData').defaultSamplerConfig,
}))
jest.mock('../lib/state/TTS', () => {
    const state = { insertBuffer: jest.fn() }
    return { useTTSStore: { getState: () => state } }
})
jest.mock('../lib/storage/MMKV', () => ({ mmkv: { getBoolean: jest.fn() } }))
jest.mock('../lib/state/Logger', () => ({
    Logger: {
        errorToast: jest.fn(),
        infoToast: jest.fn(),
        warnToast: jest.fn(),
        info: jest.fn(),
        warn: jest.fn(),
        error: jest.fn(),
        debug: jest.fn(),
        stackTrace: jest.fn(),
    },
}))
jest.mock('../lib/state/chat', () => ({
    useGenerationState: require('../lib/state/chat/generationState').useGenerationState,
    Chats: {
        useChatState: require('../lib/state/chat/state').useChatState,
        db: {
            query: {
                swipeContext: () => ({ chat_id: 10 }),
                chatRow: () => ({ character_id: 1 }),
                chat: () => ({ messages: [] }),
                chatName: () => 'Named chat',
            },
            update: { swipe: jest.fn(), chat: jest.fn() },
        },
        actions: {
            updateSwipe: jest.fn(),
            finishGeneration: jest.fn(),
            countMessageTokens: jest.fn(),
        },
    },
}))
jest.mock('../lib/engine/Local/LlamaLocal', () => {
    const modelState = {
        model: { name: 'model' },
        context: {
            isMultimodalEnabled: jest.fn(),
            getMultimodalSupport: jest.fn(),
            getFormattedChat: jest.fn(),
        },
        load: jest.fn(),
        completion: jest.fn(),
        stopCompletion: jest.fn(),
        tokenize: jest.fn(),
        loadKV: jest.fn(),
        tokenLength: async () => 1,
    }
    return {
        Llama: {
            useLlamaModelStore: { getState: () => modelState },
            useLlamaPreferencesStore: {
                getState: () => ({ config: { context_length: 4096, threads: 2 } }),
            },
        },
    }
})
jest.mock('../lib/engine/Local/Model', () => ({
    Model: {},
    KV: {
        useKVStore: {
            getState: () => ({
                kvCacheLoaded: false,
                verifyKVCache: () => ({ match: false, matchLength: 1, cachedLength: 2 }),
                setKvCacheLoaded: jest.fn(),
            }),
        },
    },
}))

const model = Llama.useLlamaModelStore.getState()
const tickUntil = async (predicate: () => boolean) => {
    for (let i = 0; i < 100 && !predicate(); i++) await Promise.resolve()
    expect(predicate()).toBe(true)
}
const startLocal = () => {
    useGenerationState.getState().startGenerating(31)
    return localInference(useGenerationState.getState().generationId)
}

beforeEach(() => {
    jest.clearAllMocks()
    useGenerationState.getState().reset()
    useChatState.getState().setChat(10)
    useChatState.getState().setBuffer({ data: '' })
    jest.mocked(useAppModeStore.getState).mockReturnValue({ appMode: 'remote' } as ReturnType<
        typeof useAppModeStore.getState
    >)
    jest.mocked(mmkv.getBoolean).mockReturnValue(false)
    jest.mocked(buildTextCompletionContext).mockResolvedValue('prompt')
    jest.mocked(buildChatCompletionContext).mockResolvedValue([])
    jest.mocked(getDataSources).mockResolvedValue([])
    jest.mocked(model.context!.isMultimodalEnabled).mockResolvedValue(false)
    jest.mocked(model.completion).mockResolvedValue(undefined)
    jest.mocked(model.loadKV).mockResolvedValue(true)
    jest.mocked(model.tokenize).mockResolvedValue({ tokens: [1] })
})

test('busy regenerate and continue do not mutate text or the database', async () => {
    useGenerationState.getState().startGenerating(31)
    useChatState.getState().setBuffer({ data: 'in flight' })
    const swipe = { id: 31, swipe: 'old response', reset_length: 3 } as Parameters<
        typeof regenerateResponse
    >[0]
    await regenerateResponse(swipe)
    await continueResponse(swipe)
    expect(Chats.actions.updateSwipe).not.toHaveBeenCalled()
    expect(Chats.db.update.swipe).not.toHaveBeenCalled()
    expect(useChatState.getState().buffer.data).toBe('in flight')
    expect(BackgroundService.start).not.toHaveBeenCalled()
})

test('background service startup failure finalizes the accepted generation', async () => {
    jest.mocked(BackgroundService.start).mockRejectedValueOnce(new Error('service failed'))
    await generateResponse(31)
    expect(Chats.actions.finishGeneration).toHaveBeenCalledWith(
        expect.objectContaining({ notify: false })
    )
    expect(Logger.errorToast).toHaveBeenCalled()
})

test('remote background task remains pending until the stream task finishes', async () => {
    let task!: () => Promise<void>
    jest.mocked(BackgroundService.start).mockImplementation(async (callback) => {
        task = callback as () => Promise<void>
    })
    let finish!: () => void
    const done = new Promise<void>((resolve) => {
        finish = resolve
    })
    jest.mocked(buildAndSendRequest).mockReturnValue({ abort: jest.fn(), done: done })
    await generateResponse(31)
    let ended = false
    const pending = task().then(() => {
        ended = true
    })
    await tickUntil(() => jest.mocked(buildAndSendRequest).mock.calls.length === 1)
    expect(ended).toBe(false)
    finish()
    await pending
    expect(ended).toBe(true)
})

test('local completion remains pending until the native completion resolves', async () => {
    let finish!: () => void
    jest.mocked(model.completion).mockImplementationOnce(
        () =>
            new Promise<void>((resolve) => {
                finish = resolve
            })
    )
    const pending = startLocal()
    await tickUntil(() => jest.mocked(model.completion).mock.calls.length === 1)
    expect(Chats.actions.finishGeneration).not.toHaveBeenCalled()
    finish()
    await pending
    expect(Chats.actions.finishGeneration).toHaveBeenCalledTimes(1)
    expect(Chats.actions.finishGeneration).toHaveBeenCalledWith(
        expect.objectContaining({ notify: true })
    )
})

test('local context receives the same additional data sources as remote context', async () => {
    const sources = [{ name: 'notes', tokenBudget: 1, priority: 1, retrieve: async () => [] }]
    jest.mocked(getDataSources).mockResolvedValue(sources)
    await startLocal()
    expect(getDataSources).toHaveBeenCalledWith(10)
    expect(buildTextCompletionContext).toHaveBeenCalledWith(
        expect.objectContaining({ dataSources: sources })
    )
})

test('KV mismatch waits for the decision instead of returning from the background task', async () => {
    const Alert = require('../app/components/views/Alert').default
    jest.mocked(mmkv.getBoolean).mockImplementation((key) => key === AppSettings.SaveLocalKV)
    const pending = startLocal()
    await tickUntil(() => Alert.alert.mock.calls.length === 1)
    expect(Chats.actions.finishGeneration).not.toHaveBeenCalled()
    expect(model.completion).not.toHaveBeenCalled()
    Alert.alert.mock.calls[0][0].buttons[1].onPress()
    await pending
    expect(model.loadKV).toHaveBeenCalledTimes(1)
    expect(model.completion).toHaveBeenCalledTimes(1)
    expect(Chats.actions.finishGeneration).toHaveBeenCalledTimes(1)
})

test('dismissing the KV mismatch cancels without invoking native completion', async () => {
    const Alert = require('../app/components/views/Alert').default
    jest.mocked(mmkv.getBoolean).mockImplementation((key) => key === AppSettings.SaveLocalKV)
    const pending = startLocal()
    await tickUntil(() => Alert.alert.mock.calls.length === 1)
    Alert.alert.mock.calls[0][0].onDismiss()
    await pending
    expect(model.completion).not.toHaveBeenCalled()
    expect(Chats.actions.finishGeneration).toHaveBeenCalledWith(
        expect.objectContaining({ notify: false })
    )
})

test('a late native delta cannot modify a newer regeneration of the same swipe', async () => {
    let output!: (text: string) => void
    let finish!: () => void
    jest.mocked(model.completion).mockImplementationOnce((_payload, callback) => {
        output = callback!
        return new Promise<void>((resolve) => {
            finish = resolve
        })
    })
    const pending = startLocal()
    await tickUntil(() => jest.mocked(model.completion).mock.calls.length === 1)
    useGenerationState.getState().startGenerating(31)
    useChatState.getState().setBuffer({ data: 'new attempt' })
    output('stale')
    finish()
    await pending
    expect(useChatState.getState().buffer.data).toBe('new attempt')
})

test('multimodal capability changes do not leak between local models', async () => {
    jest.mocked(mmkv.getBoolean).mockImplementation((key) => key === AppSettings.UseModelTemplate)
    jest.mocked(model.context!.isMultimodalEnabled)
        .mockResolvedValueOnce(true)
        .mockResolvedValueOnce(false)
    jest.mocked(model.context!.getMultimodalSupport).mockResolvedValue({
        vision: true,
        audio: false,
    })
    jest.mocked(model.context!.getFormattedChat).mockResolvedValue({
        type: 'jinja',
        has_media: false,
        prompt: 'formatted',
        media_paths: [],
    } as Awaited<ReturnType<NonNullable<typeof model.context>['getFormattedChat']>>)
    await startLocal()
    await startLocal()
    const first = jest.mocked(buildChatCompletionContext).mock.calls[0][0].apiConfig.request
        .completionType
    const second = jest.mocked(buildChatCompletionContext).mock.calls[1][0].apiConfig.request
        .completionType
    expect(first).toMatchObject({ supportsImages: true })
    expect(second).toMatchObject({ supportsImages: false })
})

test('structured reasoning uses content tags and keeps reasoning and closing tags out of TTS', async () => {
    let task!: () => Promise<void>
    jest.mocked(BackgroundService.start).mockImplementation(async (callback) => {
        task = callback as () => Promise<void>
    })
    jest.mocked(buildAndSendRequest).mockImplementationOnce((params) => {
        params.onData({ type: 'text', content: '<think>thought</think>' })
        params.onData({ type: 'text', content: 'answer' })
        return { abort: jest.fn(), done: Promise.resolve() }
    })
    await generateResponse(31)
    await task()
    expect(useChatState.getState().buffer.data).toBe('<think>thought</think>answer')
    expect(useTTSStore.getState().insertBuffer).toHaveBeenCalledTimes(1)
    expect(useTTSStore.getState().insertBuffer).toHaveBeenCalledWith('answer')
})

test('local stop strings split across native deltas are filtered and ordinary suffixes are retained', async () => {
    jest.mocked(model.completion).mockImplementationOnce(async (_payload, callback) => {
        callback!('hello ST')
        callback!('OP world S')
    })
    await startLocal()
    expect(useChatState.getState().buffer.data).toBe('hello  world S')
})

test('the fields factory exposes cancellation while field preparation is still pending', async () => {
    let task!: () => Promise<void>
    jest.mocked(BackgroundService.start).mockImplementation(async (callback) => {
        task = callback as () => Promise<void>
    })
    let finishPreparation!: (sources: Awaited<ReturnType<typeof getDataSources>>) => void
    jest.mocked(getDataSources).mockReturnValueOnce(
        new Promise((resolve) => {
            finishPreparation = resolve
        })
    )
    await generateResponse(31)
    const pending = task()
    expect(useGenerationState.getState().abortFunction).toBeDefined()
    await tickUntil(() => jest.mocked(getDataSources).mock.calls.length === 1)
    await useGenerationState.getState().abortFunction!()
    expect(buildAndSendRequest).not.toHaveBeenCalled()
    finishPreparation([])
    await pending
    expect(buildAndSendRequest).not.toHaveBeenCalled()
    expect(Chats.actions.finishGeneration).toHaveBeenCalledWith(
        expect.objectContaining({ notify: false })
    )
})

test('reply and title fields carry the same required signal from their shared controller', async () => {
    let task!: () => Promise<void>
    jest.mocked(BackgroundService.start).mockImplementation(async (callback) => {
        task = callback as () => Promise<void>
    })
    jest.mocked(mmkv.getBoolean).mockImplementation((key) => key === AppSettings.AutoGenerateTitle)
    const chatName = jest.spyOn(Chats.db.query, 'chatName').mockReturnValue('New Chat')
    jest.mocked(Chats.actions.finishGeneration).mockImplementationOnce(async (options) => {
        await options?.onSaved?.()
    })
    jest.mocked(buildAndSendRequest).mockImplementation((params) => {
        const done = Promise.resolve().then(async () => {
            await params.stopGenerating?.('completed')
            await params.onEnd?.('')
        })
        return { abort: jest.fn(), done: done }
    })
    try {
        await generateResponse(31)
        await task()
        const calls = jest.mocked(buildAndSendRequest).mock.calls
        expect(calls).toHaveLength(2)
        const signal = calls[0][0].signal
        expect(signal).toBeInstanceOf(AbortSignal)
        expect(calls[1][0].signal).toBe(signal)
        await useGenerationState.getState().abortFunction!()
        expect(signal.aborted).toBe(true)
    } finally {
        chatName.mockRestore()
    }
})
