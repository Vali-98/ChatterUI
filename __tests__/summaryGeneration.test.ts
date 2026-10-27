import type { APIBuilderParams } from '../lib/engine/API/APIBuilder'
import { buildAndSendRequest } from '../lib/engine/API/APIBuilder'
import { buildContext } from '../lib/engine/API/ContextBuilder'
import {
    captureGenerationInputs,
    estimateGenerationContext,
    prepareGenerationContext,
    type GenerationInputs,
} from '../lib/engine/generation/inputs'
import { cancelDeferredTask } from '../lib/engine/generation/scheduler'
import { Llama } from '../lib/engine/Local/LlamaLocal'
import { buildLocalPayload } from '../lib/engine/Local/payload'
import {
    generateSummary,
    prepareAutomaticSummary,
    deleteSummary,
} from '../lib/engine/summaries/actions'
import { getSummary } from '../lib/summaries/db'
import { summaryMessage } from '../lib/summaries/history'
import { useSummarySettingsStore } from '../lib/summaries/settingsStore'

jest.mock('../lib/queries/databaseQuery', () => ({
    createDatabaseQueryObserver: (query: { id: number }) => ({
        getSnapshot: () => ({ data: mockRows.has(query.id) ? [{ id: query.id }] : [] }),
        subscribe: (listener: () => void) => {
            mockOwnerListeners.add(listener)
            return () => mockOwnerListeners.delete(listener)
        },
    }),
}))
jest.mock('../lib/state/AppMode', () => ({
    useAppModeStore: { getState: () => ({ appMode: 'remote' }) },
}))
jest.mock('../lib/state/Logger', () => ({ Logger: { stackTrace: jest.fn() } }))
jest.mock('../lib/state/chat', () => ({
    Chats: { db: { query: { chat: () => ({ messages: mockMessages }) } } },
}))
jest.mock('../lib/summaries/settingsStore', () => ({
    useSummarySettingsStore: { getState: jest.fn() },
}))
jest.mock('../lib/engine/API/ContextBuilder', () => ({ buildContext: jest.fn() }))
jest.mock('../lib/engine/API/APIBuilder', () => ({ buildAndSendRequest: jest.fn() }))
jest.mock('../lib/engine/Local/LlamaLocal', () => ({
    Llama: { useLlamaModelStore: { getState: jest.fn() } },
}))
jest.mock('../lib/engine/Local/payload', () => ({ buildLocalPayload: jest.fn() }))
jest.mock('../lib/engine/generation/inputs', () => ({
    captureGenerationInputs: jest.fn(),
    estimateGenerationContext: jest.fn(),
    generationContextLimit: (inputs: any) =>
        inputs.mode === 'local' ? inputs.localConfig.context_length : inputs.samplers.max_length,
    prepareGenerationContext: jest.fn(async (inputs) => inputs),
}))
jest.mock('../lib/engine/generation/scheduler', () => ({
    cancelDeferredTask: jest.fn(),
    scheduleDeferredTask: (_chatId: number, run: (signal: AbortSignal) => Promise<void>) => {
        mockRuns.push(run)
        return { id: mockRuns.length, done: Promise.resolve(), cancel: jest.fn() }
    },
}))
jest.mock('../lib/summaries/db', () => ({
    deleteSummary: (id: number) => mockRows.delete(id),
    summaryIdentity: (id: number) => ({ id, all: () => (mockRows.has(id) ? [{ id }] : []) }),
    summaryList: () => ({ all: () => [...mockRows.values()] }),
    getSummary: (id: number) => mockRows.get(id),
    updateSummary: (id: number, changes: object) =>
        mockRows.has(id) ? Object.assign(mockRows.get(id)!, changes) : undefined,
    createSummaryDraft: (_chatId: number, messages: typeof mockMessages) => {
        const row = {
            id: mockRows.size + 1,
            chat_id: 1,
            status: 'draft',
            enabled: true,
            content: '',
            source_changed: false,
            notice_dismissed: false,
            start_entry_id: messages[0].id,
            end_entry_id: messages.at(-1)!.id,
        }
        mockRows.set(row.id, row)
        return row
    },
    restrictSummarySources: (id: number, messages: typeof mockMessages) =>
        Object.assign(mockRows.get(id)!, { end_entry_id: messages.at(-1)!.id }),
    acceptSummary: (id: number) => Object.assign(mockRows.get(id)!, { status: 'accepted' }),
}))

const mockMessages = Array.from({ length: 7 }, (_, index) => ({
    ...summaryMessage(index + 1, 'a long source message '.repeat(20), index % 2 === 1),
    name: 'Speaker',
}))
const mockRows = new Map<number, any>()
const mockOwnerListeners = new Set<() => void>()
const mockRuns: ((signal: AbortSignal) => Promise<void>)[] = []
let inputs: GenerationInputs
let settings: any
let respond: (params: APIBuilderParams) => Promise<void>
beforeEach(() => {
    jest.clearAllMocks()
    mockOwnerListeners.clear()
    mockRows.clear()
    mockRuns.length = 0
    settings = {
        enabled: true,
        autoGenerate: true,
        autoContinueDrafts: false,
        autoThreshold: 80,
        maxOutputTokens: 128,
        prompt: 'Summarize facts.',
    }
    jest.mocked(useSummarySettingsStore.getState).mockImplementation(() => settings)
    jest.mocked(estimateGenerationContext).mockResolvedValue({ total: 90, capacity: 100 })
    inputs = {
        chatId: 1,
        mode: 'remote',
        instruct: {},
        samplers: { max_length: 4096 },
        summaries: [],
        messages: mockMessages,
        apiConfig: {
            request: {
                completionType: { type: 'chatCompletions' },
                reasoningParsePattern: 'reasoning',
            },
            model: {},
        },
        apiValues: { prefill: 'roleplay prefill' },
        stopSequence: [],
        tokenizer: async (text: string) => Math.ceil(text.length / 4),
    } as unknown as GenerationInputs
    jest.mocked(buildContext).mockImplementation(async (params) =>
        params.messages.map((message) => message.swipes[0].swipe).join('\n')
    )
    jest.mocked(captureGenerationInputs).mockImplementation(() => inputs)
    respond = async (params) => {
        params.onData({ type: 'text', content: 'Short factual memory.' })
        await params.stopGenerating?.('completed')
    }
    jest.mocked(buildAndSendRequest).mockImplementation((params) => ({
        abort: jest.fn(),
        done: respond(params),
    }))
})

test('remote summaries use isolated history and do not overwrite foreground context stats', async () => {
    generateSummary(1, { inputs })
    await mockRuns[0](new AbortController().signal)
    expect(getSummary(1)?.status).toBe('accepted')
    const [request, options] = jest.mocked(prepareGenerationContext).mock.calls.at(-1)!
    expect(options).toEqual({ recordStats: false })
    expect(await request.dataSources).toEqual([])
    expect(request.apiValues?.prefill).toBe('')
    expect(request.instruct.system_prompt).toBe(settings.prompt)
    expect(request.samplers).toEqual({ ...inputs.samplers, genamt: settings.maxOutputTokens })
    expect(request.messages[0].swipes[0].swipe).not.toContain('reasoning')
    expect(request.messages[0].swipes[0].swipe).toContain('Assistant (Speaker)')
})

test.each(['cancelled', 'failed', 'limited', 'edited'])(
    '%s output remains a reviewable draft',
    async (outcome) => {
        const controller = new AbortController()
        respond = async (params) => {
            params.onData({ type: 'text', content: 'Partial memory.' })
            if (outcome === 'cancelled') controller.abort()
            if (outcome === 'limited') params.onFinishReason?.('length')
            if (outcome === 'edited') mockRows.get(1).source_changed = true
            await params.stopGenerating?.(outcome === 'failed' ? 'failed' : 'completed')
        }
        generateSummary(1, { inputs })
        await mockRuns[0](controller.signal).catch(() => {})
        expect(getSummary(1)?.status).toBe('draft')
        expect(getSummary(1)?.content).toBe('Partial memory.')
        if (outcome !== 'edited')
            expect(getSummary(1)?.error?.reason).toBe(
                outcome === 'limited'
                    ? 'output_limit'
                    : outcome === 'cancelled'
                      ? 'cancelled'
                      : 'failed'
            )
    }
)

test('Continue uses the edited partial draft and rejects stale sources', async () => {
    generateSummary(1, { inputs })
    respond = async (params) => {
        params.onData({ type: 'text', content: ' Original' })
        await params.stopGenerating?.('failed')
    }
    await mockRuns[0](new AbortController().signal).catch(() => {})
    respond = async (params) => {
        params.onData({ type: 'text', content: ' continued' })
        await params.stopGenerating?.('completed')
    }
    generateSummary(1, { inputs, summaryId: 1, continueDraft: true, draftContent: 'Edited' })
    await mockRuns[1](new AbortController().signal)
    expect(getSummary(1)?.content).toBe('Edited continued')
    expect(
        jest.mocked(prepareGenerationContext).mock.calls.at(-1)![0].messages.at(-1)?.swipes[0].swipe
    ).toBe('Edited')
    Object.assign(mockRows.get(1), { status: 'draft', source_changed: true })
    expect(() => generateSummary(1, { inputs, summaryId: 1, continueDraft: true })).toThrow(
        'regenerated'
    )
})

test('deletion immediately permits a new automatic summary of unchanged history', async () => {
    generateSummary(1, { inputs })
    await mockRuns[0](new AbortController().signal)
    await deleteSummary(1)
    expect(mockRuns).toHaveLength(2)
    expect(getSummary(1)?.status).toBe('draft')
})

test('automatic continuation is opt-in and respects Later and cancellation', async () => {
    generateSummary(1, { inputs })
    Object.assign(mockRows.get(1), {
        content: 'Partial',
        error: { reason: 'output_limit', message: 'Any display text' },
    })
    await prepareAutomaticSummary(inputs)
    expect(mockRuns).toHaveLength(1)
    settings.autoContinueDrafts = true
    mockRows.get(1).notice_dismissed = true
    await prepareAutomaticSummary(inputs)
    expect(mockRuns).toHaveLength(1)
    mockRows.get(1).notice_dismissed = false
    mockRows.get(1).error = { reason: 'cancelled', message: 'Any display text' }
    await prepareAutomaticSummary(inputs)
    expect(mockRuns).toHaveLength(1)
    mockRows.get(1).error = { reason: 'output_limit', message: 'Localized or edited display text' }
    await prepareAutomaticSummary(inputs)
    expect(mockRuns).toHaveLength(2)
    mockRows.get(1).error = { reason: 'output_limit', message: 'Localized or edited display text' }
    await prepareAutomaticSummary(inputs)
    expect(mockRuns).toHaveLength(3)
})

test('deleting a queued summary owner prevents inference from starting', async () => {
    jest.mocked(buildAndSendRequest).mockClear()
    generateSummary(1, { inputs })
    mockRows.delete(1)
    await mockRuns[0](new AbortController().signal)
    expect(buildAndSendRequest).not.toHaveBeenCalled()
    expect(mockOwnerListeners.size).toBe(0)
})

test('deleting a running summary owner cancels its request and releases its observer', async () => {
    const controller = new AbortController()
    jest.mocked(cancelDeferredTask).mockImplementation(() => controller.abort())
    respond = async (params) => {
        params.onData({ type: 'text', content: 'Partial memory' })
        mockRows.delete(1)
        mockOwnerListeners.forEach((listener) => listener())
        await params.stopGenerating?.('completed')
    }
    generateSummary(1, { inputs })
    await expect(mockRuns[0](controller.signal)).rejects.toThrow('Cancelled')
    expect(controller.signal.aborted).toBe(true)
    expect(mockOwnerListeners.size).toBe(0)
})

test.each([false, true])(
    'local summary preserves chat KV files and handles cancellation (%s)',
    async (cancel) => {
        const controller = new AbortController()
        const stopCompletion = jest.fn(async () => {})
        const completion = jest.fn(async (_payload, onText, onComplete, _options) => {
            onText('<think>reasoning</think>Short memory')
            if (cancel) controller.abort()
            onComplete('Short memory', { predicted_n: 10 })
        })
        jest.mocked(Llama.useLlamaModelStore.getState).mockReturnValue({
            context: { stopCompletion },
            model: { id: 1 },
            completion,
        } as any)
        jest.mocked(buildLocalPayload).mockResolvedValue({
            prompt: 'summary',
            n_predict: 128,
        } as any)
        inputs = {
            ...inputs,
            mode: 'local',
            localConfig: { context_length: 4096 } as any,
            localModel: { id: 1 } as any,
            activateLocalTokenizer: jest.fn(),
        }
        generateSummary(1, { inputs })
        if (cancel) await expect(mockRuns[0](controller.signal)).rejects.toThrow('Cancelled')
        else await mockRuns[0](controller.signal)
        expect(getSummary(1)?.content).toBe('Short memory')
        expect(getSummary(1)?.status).toBe(cancel ? 'draft' : 'accepted')
        expect(completion.mock.calls[0][3]).toEqual({ saveKV: false })
        expect(buildLocalPayload).toHaveBeenLastCalledWith(
            expect.objectContaining({ saveLocalKV: false }),
            { continuing: false, recordStats: false }
        )
        if (cancel) expect(stopCompletion).toHaveBeenCalledTimes(1)
    }
)

test('an empty continuation does not silently accept an unfinished prefix', async () => {
    generateSummary(1, { inputs })
    respond = async (params) => {
        params.onData({ type: 'text', content: 'Partial' })
        await params.stopGenerating?.('failed')
    }
    await mockRuns[0](new AbortController().signal).catch(() => {})
    respond = async (params) => {
        await params.stopGenerating?.('completed')
    }
    generateSummary(1, { inputs, summaryId: 1, continueDraft: true })
    await expect(mockRuns[1](new AbortController().signal)).rejects.toThrow('returned no text')
    expect(getSummary(1)?.status).toBe('draft')
    expect(getSummary(1)?.content).toBe('Partial')
})

test('cancellation during final tokenization cannot accept the draft', async () => {
    const controller = new AbortController()
    let finalTokenizations = 0
    inputs.tokenizer = async (text) => {
        if (text === 'Short factual memory.' && ++finalTokenizations === 1) controller.abort()
        return Math.ceil(text.length / 4)
    }
    generateSummary(1, { inputs })
    await expect(mockRuns[0](controller.signal)).rejects.toThrow('Cancelled')
    expect(getSummary(1)?.status).toBe('draft')
})

test('summary text is only persisted when the request settles', async () => {
    respond = async (params) => {
        params.onData({ type: 'text', content: 'Short ' })
        expect(getSummary(1)?.content).toBe('')
        params.onData({ type: 'text', content: 'memory' })
        expect(getSummary(1)?.content).toBe('')
        await params.stopGenerating?.('completed')
    }
    generateSummary(1, { inputs })
    await mockRuns[0](new AbortController().signal)
    expect(getSummary(1)?.content).toBe('Short memory')
})

test('accepted summaries can be deleted without changing chat history', async () => {
    settings.autoGenerate = false
    generateSummary(1, { inputs })
    await mockRuns[0](new AbortController().signal)
    expect(getSummary(1)?.status).toBe('accepted')
    deleteSummary(1)
    expect(getSummary(1)).toBeUndefined()
    expect(mockMessages).toHaveLength(7)
})

test('normal completion can exceed the output budget according to our tokenizer', async () => {
    const content = 'A compact memory. '.repeat(32)
    expect(await inputs.tokenizer(content)).toBeGreaterThan(settings.maxOutputTokens)
    respond = async (params) => {
        params.onData({ type: 'text', content })
        await params.stopGenerating?.('completed')
    }
    generateSummary(1, { inputs })
    await mockRuns[0](new AbortController().signal)
    expect(getSummary(1)).toMatchObject({ status: 'accepted', content })
})

test('Continue on an empty draft starts generation with its existing source range', async () => {
    generateSummary(1, { inputs })
    const originalEnd = getSummary(1)?.end_entry_id
    generateSummary(1, { inputs, summaryId: 1, continueDraft: true, draftContent: '' })
    await mockRuns[1](new AbortController().signal)
    expect(getSummary(1)).toMatchObject({
        status: 'accepted',
        content: 'Short factual memory.',
        end_entry_id: originalEnd,
    })
    const [request] = jest.mocked(prepareGenerationContext).mock.calls.at(-1)!
    expect(request.messages).toHaveLength(1)
})

test.each(['chat', 'text'])(
    'formatted %s prompt overhead trims coverage before sending',
    async (mode) => {
        inputs.samplers.max_length = 1100
        jest.mocked(buildContext).mockImplementation(async (params) => {
            const prompt =
                'x'.repeat(2400) +
                params.messages.map((message) => message.swipes[0].swipe).join('\n')
            params.onContextStats?.({ total: await inputs.tokenizer(prompt) } as any)
            return mode === 'text' ? prompt : [{ role: 'user', content: prompt }]
        })
        generateSummary(1, { inputs })
        await mockRuns[0](new AbortController().signal)
        expect(getSummary(1)?.end_entry_id).toBeLessThan(5)
        const request = jest.mocked(buildAndSendRequest).mock.calls.at(-1)![0]
        expect(request.messages[0].swipes[0].swipe).toContain('a long source message')
        expect(request.bypassContextLength).toBe(true)
        expect(getSummary(1)?.status).toBe('accepted')
    }
)

test('continuation refuses to silently shrink coverage when formatted overhead no longer fits', async () => {
    generateSummary(1, { inputs })
    jest.mocked(buildContext).mockResolvedValue('x'.repeat(20_000))
    generateSummary(1, { inputs, summaryId: 1, continueDraft: true, draftContent: 'Partial' })
    await expect(mockRuns[1](new AbortController().signal)).rejects.toThrow('Draft no longer fits')
    expect(buildAndSendRequest).not.toHaveBeenCalled()
    expect(getSummary(1)?.end_entry_id).toBe(5)
})

test('local summaries fit the native formatted prompt before recording coverage', async () => {
    const completion = jest.fn(async (_payload, onText, onComplete) => {
        onText('Short memory')
        onComplete('Short memory', { predicted_n: 10 })
    })
    jest.mocked(Llama.useLlamaModelStore.getState).mockReturnValue({
        context: { stopCompletion: jest.fn(async () => {}) },
        model: { id: 1 },
        completion,
    } as any)
    inputs = {
        ...inputs,
        mode: 'local',
        localConfig: { context_length: 1100 } as any,
        localModel: { id: 1 } as any,
        activateLocalTokenizer: jest.fn(),
    }
    jest.mocked(buildLocalPayload).mockImplementation(
        async (request) =>
            ({
                prompt:
                    'x'.repeat(2400) +
                    request.messages.map((message) => message.swipes[0].swipe).join('\n'),
                n_predict: 128,
            }) as any
    )
    generateSummary(1, { inputs })
    await mockRuns[0](new AbortController().signal)
    expect(getSummary(1)?.end_entry_id).toBeLessThan(5)
    expect(await inputs.tokenizer((completion.mock.calls[0] as any)[0].prompt)).toBeLessThanOrEqual(
        1100 - settings.maxOutputTokens
    )
    expect(getSummary(1)?.status).toBe('accepted')
})

test('an ignored draft keeps its original text and coverage as the chat grows', async () => {
    generateSummary(1, { inputs })
    Object.assign(mockRows.get(1), { content: 'Unfinished memory', notice_dismissed: true })
    const before = { ...getSummary(1) }
    inputs.messages = [
        ...inputs.messages,
        summaryMessage(8, 'new user'),
        summaryMessage(9, 'new answer', false),
    ]
    settings.autoContinueDrafts = true
    expect(await prepareAutomaticSummary(inputs)).toBeUndefined()
    expect(getSummary(1)).toEqual(before)
    expect(mockRuns).toHaveLength(1)
    expect(estimateGenerationContext).not.toHaveBeenCalled()
})
