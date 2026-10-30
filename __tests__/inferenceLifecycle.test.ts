import BackgroundService from 'react-native-background-actions'

import { AppSettings } from '../lib/constants/appSettings'
import { buildAndSendRequest } from '../lib/engine/API/APIBuilder'
import {
    buildChatCompletionContext,
    buildTextCompletionContext,
} from '../lib/engine/API/ContextBuilder'
import { getDataSources } from '../lib/engine/DataSources'
import { captureGenerationInputs } from '../lib/engine/generation/inputs'
import { finishGeneration } from '../lib/engine/generation/lifecycle'
import { abortGeneration, beginGeneration } from '../lib/engine/generation/runtime'
import { useGenerationState } from '../lib/engine/generation/state'
import {
    continueResponse,
    generateResponse,
    regenerateResponse,
    submitMessage,
} from '../lib/engine/Inference'
import { Llama } from '../lib/engine/Local/LlamaLocal'
import { localInference } from '../lib/engine/LocalInference'
import { prepareAutomaticSummary } from '../lib/engine/summaries/actions'
import { useAppModeStore } from '../lib/state/AppMode'
import { Chats } from '../lib/state/chat'
import { useChatAccessState } from '../lib/state/chat/access'
import { mmkv } from '../lib/storage/MMKV'
import { useSummarySettingsStore } from '../lib/summaries/settingsStore'

jest.mock('react-native-background-actions', () => ({
    __esModule: true,
    default: { start: jest.fn(), stop: jest.fn(async () => {}) },
}))
jest.mock('i18next', () => ({ t: (key: string) => key }))
jest.mock('../components/views/Alert', () => ({
    __esModule: true,
    default: { alert: jest.fn() },
}))
jest.mock('../lib/summaries/settingsStore', () => ({
    useSummarySettingsStore: { getState: jest.fn(() => ({ enabled: true, autoGenerate: false })) },
}))
jest.mock('../lib/summaries/db', () => ({ summaryList: () => ({ all: () => [] }) }))
jest.mock('../lib/engine/summaries/actions', () => ({ prepareAutomaticSummary: jest.fn() }))
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
    Chats: {
        db: {
            query: {
                historyCutoff: () => undefined,
                swipe: jest.fn(),
                reasoning: jest.fn(),
                swipeContext: (id: number) => ({ chat_id: id === 31 ? 10 : 11 }),
                chatName: jest.fn(() => 'Named chat'),
            },
            live: {
                chat: () => ({ sync: () => ({ messages: [] }) }),
                historyPage: () => ({ sync: () => [] }),
            },
            update: { swipe: jest.fn(), chat: jest.fn() },
        },
        actions: {
            createTurn: jest.fn(),
            createMessage: jest.fn(),
            updateSwipe: jest.fn(),
            countMessageTokens: jest.fn(),
        },
    },
}))
jest.mock('../lib/engine/generation/inputs', () => ({
    generationContextLimit: () => 4096,
    captureGenerationInputs: jest.fn((chatId, mode) => ({
        chatId,
        mode,
        messages: [],
        activateLocalTokenizer: () => {},
        character: { id: 1, name: 'Character', links: [] },
        user: { id: 2, name: 'User' },
        samplers: require('../lib/constants/SamplerData').defaultSamplerConfig,
        localConfig: { context_length: 4096, threads: 2 },
        stopSequence: ['STOP'],
        saveLocalKV: require('../lib/storage/MMKV').mmkv.getBoolean('settings-local-save-kv'),
        autoTitle: false,
        useModelTemplate: false,
        apiConfig: require('../lib/engine/API/DefaultAPI').defaultTemplates[0],
        apiValues: { model: {}, endpoint: 'https://example.test', key: '' },
    })),
    prepareGenerationContext: jest.fn(async (inputs) => ({
        character: inputs.character,
        user: inputs.user,
        messages: inputs.messages,
        instruct: {},
        cache: {},
        tokenizer: async () => 1,
        chatTokenizer: async () => 1,
        dataSources: await require('../lib/engine/DataSources').getDataSources(inputs.chatId),
    })),
}))
jest.mock('../lib/engine/generation/lifecycle', () => ({
    finishGeneration: jest.fn(async (id, reason) => {
        require('../lib/engine/generation/state').updateGeneration(id, {
            status: reason,
            persisted: true,
        })
        require('../lib/engine/generation/runtime').releaseGenerationRuntime(id)
    }),
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
const reserve = (chatId = 10, swipeId = 31, mode: 'local' | 'remote' = 'remote') =>
    beginGeneration({ chatId, swipeId, mode, text: '' })!
const startLocal = (overrides = {}) => {
    const generation = reserve(10, 31, 'local')
    const inputs = { ...captureGenerationInputs(10, 'local'), ...overrides }
    return { generation, pending: localInference(generation.id, inputs) }
}
beforeEach(() => {
    jest.mocked(useSummarySettingsStore.getState).mockReturnValue({
        enabled: true,
        autoGenerate: false,
    } as any)
    jest.mocked(prepareAutomaticSummary).mockReset()
    useChatAccessState.setState({ leases: {} })
    jest.clearAllMocks()
    useGenerationState.setState({ generations: {} })
    jest.mocked(useAppModeStore.getState).mockReturnValue({ appMode: 'remote' } as ReturnType<
        typeof useAppModeStore.getState
    >)
    jest.mocked(mmkv.getBoolean).mockReturnValue(true)
    jest.mocked(BackgroundService.start).mockImplementation(async (callback) => {
        void callback!()
    })
    jest.mocked(buildTextCompletionContext).mockResolvedValue('prompt')
    jest.mocked(buildChatCompletionContext).mockResolvedValue([])
    jest.mocked(getDataSources).mockResolvedValue([])
    jest.mocked(model.context!.isMultimodalEnabled).mockResolvedValue(false)
    jest.mocked(model.completion).mockResolvedValue(undefined)
    jest.mocked(model.loadKV).mockResolvedValue(true)
    jest.mocked(model.tokenize).mockResolvedValue({ tokens: [1] })
    jest.mocked(buildAndSendRequest).mockImplementation((params) => ({
        abort: jest.fn(),
        done: Promise.resolve().then(async () => {
            await params.stopGenerating?.('completed')
            await params.onEnd?.('')
        }),
    }))
})

test('busy regenerate and continue do not mutate the target', async () => {
    reserve()
    const swipe = { id: 31, swipe: 'old response', reset_length: 3 } as Parameters<
        typeof regenerateResponse
    >[0]
    await regenerateResponse(swipe)
    await continueResponse(swipe)
    expect(Chats.actions.updateSwipe).not.toHaveBeenCalled()
    expect(Chats.db.update.swipe).not.toHaveBeenCalled()
    expect(BackgroundService.start).not.toHaveBeenCalled()
})

test('service startup failure finalizes the accepted generation', async () => {
    jest.mocked(BackgroundService.start).mockRejectedValueOnce(new Error('service failed'))
    await generateResponse(31)
    expect(finishGeneration).toHaveBeenCalledWith(expect.any(Number), 'failed')
})

test('two remote chats have independent output, signals and a shared service', async () => {
    const releases: (() => void)[] = []
    jest.mocked(buildAndSendRequest).mockImplementation((params) => ({
        abort: jest.fn(),
        done: new Promise<void>((resolve) =>
            releases.push(() => {
                void params.stopGenerating?.('completed')
                resolve()
            })
        ),
    }))
    const first = generateResponse(31)
    await tickUntil(() => jest.mocked(buildAndSendRequest).mock.calls.length === 1)
    const second = generateResponse(32)
    await tickUntil(() => jest.mocked(buildAndSendRequest).mock.calls.length === 2)
    const calls = jest.mocked(buildAndSendRequest).mock.calls
    calls[0][0].onData({ type: 'text', content: 'first' })
    calls[1][0].onData({ type: 'text', content: 'second' })
    expect(
        Object.values(useGenerationState.getState().generations).map((item) => item.text)
    ).toEqual(['first', 'second'])
    await abortGeneration(10)
    expect(calls[0][0].signal.aborted).toBe(true)
    expect(calls[1][0].signal.aborted).toBe(false)
    expect(BackgroundService.start).toHaveBeenCalledTimes(1)
    releases.forEach((release) => release())
    await Promise.all([first, second])
    await Promise.resolve()
})

test('local completion waits for native completion', async () => {
    let finish!: () => void
    jest.mocked(model.completion).mockImplementationOnce(
        () =>
            new Promise<void>((resolve) => {
                finish = resolve
            })
    )
    const { pending } = startLocal({ saveLocalKV: false })
    await tickUntil(() => jest.mocked(model.completion).mock.calls.length === 1)
    expect(finishGeneration).not.toHaveBeenCalled()
    finish()
    await pending
    expect(finishGeneration).toHaveBeenCalledWith(expect.any(Number), 'completed')
})

test('local context receives additional sources', async () => {
    const sources = [{ name: 'notes', tokenBudget: 1, priority: 1, retrieve: async () => [] }]
    jest.mocked(getDataSources).mockResolvedValue(sources)
    await startLocal({ saveLocalKV: false }).pending
    expect(buildTextCompletionContext).toHaveBeenCalledWith(
        expect.objectContaining({ dataSources: sources })
    )
})

test('KV mismatch waits for a decision', async () => {
    const Alert = require('../components/views/Alert').default
    const { pending } = startLocal({ saveLocalKV: true })
    await tickUntil(() => Alert.alert.mock.calls.length === 1)
    expect(model.completion).not.toHaveBeenCalled()
    Alert.alert.mock.calls[0][0].buttons[1].onPress()
    await pending
    expect(model.loadKV).toHaveBeenCalledTimes(1)
    expect(model.completion).toHaveBeenCalledTimes(1)
})

test('abort dismisses pending KV choice without starting completion', async () => {
    const Alert = require('../components/views/Alert').default
    const { pending } = startLocal({ saveLocalKV: true })
    await tickUntil(() => Alert.alert.mock.calls.length === 1)
    await abortGeneration(10)
    await pending
    expect(model.completion).not.toHaveBeenCalled()
    expect(finishGeneration).toHaveBeenCalledWith(expect.any(Number), 'cancelled')
})

test('local split stops are removed without dropping ordinary suffixes', async () => {
    jest.mocked(model.completion).mockImplementationOnce(async (_payload, callback) => {
        callback!('hello ST')
        callback!('OP world S')
    })
    const { generation, pending } = startLocal({ saveLocalKV: false })
    await pending
    expect(useGenerationState.getState().generations[generation.id].text).toBe('hello  world S')
})

test('cancellation during preparation prevents dispatch', async () => {
    let ready!: (sources: Awaited<ReturnType<typeof getDataSources>>) => void
    jest.mocked(getDataSources).mockReturnValueOnce(
        new Promise((resolve) => {
            ready = resolve
        })
    )
    const pending = generateResponse(31)
    await tickUntil(() => jest.mocked(getDataSources).mock.calls.length === 1)
    await abortGeneration(10)
    ready([])
    await pending
    expect(buildAndSendRequest).not.toHaveBeenCalled()
    expect(finishGeneration).toHaveBeenCalledWith(expect.any(Number), 'cancelled')
})

test('title uses parent inputs and an independent signal after foreground completion', async () => {
    const name = jest.spyOn(Chats.db.query, 'chatName').mockReturnValue('New Chat')
    const capture = jest.mocked(captureGenerationInputs)
    const base = capture.getMockImplementation()!
    capture.mockImplementationOnce((chatId, mode) => ({ ...base(chatId, mode), autoTitle: true }))
    let requests = 0
    jest.mocked(buildAndSendRequest).mockImplementation((params) => {
        const isTitle = ++requests === 2
        params.onData({ type: 'text', content: 'generated text' })
        return {
            abort: jest.fn(),
            done: Promise.resolve().then(async () => {
                await params.stopGenerating?.('completed')
                if (isTitle)
                    useChatAccessState.setState({ leases: { 10: Symbol('next-generation') } })
                await params.onEnd?.('')
            }),
        }
    })
    await generateResponse(31)
    await tickUntil(() => jest.mocked(buildAndSendRequest).mock.calls.length === 2)
    const calls = jest.mocked(buildAndSendRequest).mock.calls
    expect(capture).toHaveBeenCalledTimes(1)
    expect(calls[1][0].apiValues).toBe(calls[0][0].apiValues)
    expect(calls[1][0].signal).not.toBe(calls[0][0].signal)
    expect(calls[1][0].samplers).toEqual(calls[0][0].samplers)
    await tickUntil(() => jest.mocked(Chats.db.update.chat).mock.calls.length > 0)
    expect(Chats.db.update.chat).toHaveBeenCalledWith(10, { name: 'Generated Text' })
    name.mockRestore()
})

test('a local task cancelled before execution still finalizes and releases its chat', async () => {
    const generation = reserve(10, 31, 'local')
    await abortGeneration(10)
    await localInference(generation.id, captureGenerationInputs(10, 'local'))
    expect(model.completion).not.toHaveBeenCalled()
    expect(finishGeneration).toHaveBeenCalledWith(generation.id, 'cancelled')
})

test('Send reserves the chat before awaiting message creation', async () => {
    let save!: (message: Awaited<ReturnType<typeof Chats.actions.createTurn>>) => void
    jest.mocked(Chats.actions.createTurn).mockImplementationOnce(
        () =>
            new Promise((resolve) => {
                save = resolve
            })
    )
    jest.mocked(Chats.actions.createTurn).mockResolvedValue({
        swipes: [{ id: 31, active: true }],
    } as any)
    const first = submitMessage(10, { text: 'hello', attachmentUris: [] })
    expect(await submitMessage(10, { text: 'duplicate', attachmentUris: [] })).toBe(false)
    await tickUntil(() => jest.mocked(Chats.actions.createTurn).mock.calls.length === 1)
    save({ swipes: [{ id: 31, active: true }] } as any)
    expect(await first).toBe(true)
    await tickUntil(() => jest.mocked(buildAndSendRequest).mock.calls.length === 1)
    await new Promise((resolve) => setTimeout(resolve, 0))
})

test('regeneration context uses the retained prefix rather than the previous full response', async () => {
    const capture = jest.mocked(captureGenerationInputs)
    const base = capture.getMockImplementation()!
    capture.mockImplementationOnce(
        (chatId, mode) =>
            ({
                ...base(chatId, mode),
                messages: [{ swipes: [{ id: 31, active: true, swipe: 'old response' }] }],
            }) as any
    )
    await regenerateResponse({ id: 31, swipe: 'old response', reset_length: 3 } as any)
    expect(jest.mocked(buildAndSendRequest).mock.calls[0][0].messages[0].swipes[0].swipe).toBe(
        'old'
    )
})

test('multimodal capability changes do not leak between local models', async () => {
    jest.mocked(model.context!.isMultimodalEnabled)
        .mockResolvedValueOnce(true)
        .mockResolvedValueOnce(false)
    jest.mocked(model.context!.getMultimodalSupport).mockResolvedValue({
        vision: true,
        audio: false,
    })
    jest.mocked(model.context!.getFormattedChat).mockResolvedValue({
        type: 'jinja',
        prompt: 'formatted',
        media_paths: [],
        has_media: false,
    } as any)
    await startLocal({ saveLocalKV: false, useModelTemplate: true }).pending
    await startLocal({ saveLocalKV: false, useModelTemplate: true }).pending
    expect(
        jest.mocked(buildChatCompletionContext).mock.calls[0][0].apiConfig.request.completionType
    ).toMatchObject({ supportsImages: true })
    expect(
        jest.mocked(buildChatCompletionContext).mock.calls[1][0].apiConfig.request.completionType
    ).toMatchObject({ supportsImages: false })
})

test('regenerating a continuation preserves a reasoning checkpoint even when the answer prefix is empty', async () => {
    jest.mocked(Chats.db.query.reasoning).mockReturnValueOnce({
        swipe_id: 31,
        content: 'Original thoughtAdditional thought',
        reset_length: 'Original thought'.length,
    })
    await regenerateResponse({ id: 31, swipe: 'Continued answer', reset_length: 0 } as any)
    const generation = Object.values(useGenerationState.getState().generations)[0]
    expect(generation.text).toBe('')
    expect(generation.reasoning).toBe('Original thought')
})

test.each(['local', 'remote'] as const)(
    'a %s completion waits for compaction and proceeds when compaction is cancelled',
    async (mode) => {
        jest.mocked(useSummarySettingsStore.getState).mockReturnValue({
            enabled: true,
            autoGenerate: true,
        } as any)
        let finish!: () => void
        const cancel = jest.fn(() => finish())
        const done = new Promise<void>((resolve) => {
            finish = resolve
        })
        jest.mocked(prepareAutomaticSummary).mockResolvedValue({
            id: 77,
            summaryId: 1,
            done,
            cancel,
        })
        jest.mocked(useAppModeStore.getState).mockReturnValue({ appMode: mode } as any)
        jest.mocked(mmkv.getBoolean).mockReturnValue(false)
        const pending = generateResponse(31)
        await tickUntil(() =>
            Object.values(useGenerationState.getState().generations).some(
                (item) => item.status === 'summarizing'
            )
        )
        expect(model.completion).not.toHaveBeenCalled()
        expect(buildAndSendRequest).not.toHaveBeenCalled()
        expect(await submitMessage(10, { text: 'duplicate' })).toBe(false)
        cancel()
        await pending
        if (mode === 'local') expect(model.completion).toHaveBeenCalledTimes(1)
        else expect(buildAndSendRequest).toHaveBeenCalledTimes(1)
    }
)

test('stopping the parent request also cancels compaction and prevents dispatch', async () => {
    jest.mocked(useSummarySettingsStore.getState).mockReturnValue({
        enabled: true,
        autoGenerate: true,
    } as any)
    let finish!: () => void
    const cancel = jest.fn(() => finish())
    const done = new Promise<void>((resolve) => {
        finish = resolve
    })
    jest.mocked(prepareAutomaticSummary).mockResolvedValue({ id: 77, summaryId: 1, done, cancel })
    const pending = generateResponse(31)
    await tickUntil(() =>
        Object.values(useGenerationState.getState().generations).some(
            (item) => item.status === 'summarizing'
        )
    )
    await abortGeneration(10)
    await pending
    expect(cancel).toHaveBeenCalledTimes(1)
    expect(buildAndSendRequest).not.toHaveBeenCalled()
    expect(finishGeneration).toHaveBeenCalledWith(expect.any(Number), 'cancelled')
})

test('compaction preparation failure does not discard the pending chat completion', async () => {
    jest.mocked(useSummarySettingsStore.getState).mockReturnValue({
        enabled: true,
        autoGenerate: true,
    } as any)
    jest.mocked(prepareAutomaticSummary).mockRejectedValue(new Error('Cannot prepare summary'))
    await generateResponse(31)
    expect(buildAndSendRequest).toHaveBeenCalledTimes(1)
})
