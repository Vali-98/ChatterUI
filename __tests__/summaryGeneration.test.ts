import type { APIBuilderParams } from '../lib/engine/API/APIBuilder'
import { buildAndSendRequest } from '../lib/engine/API/APIBuilder'
import { useContextStatsState } from '../lib/engine/generation/contextStatsState'
import { prepareGenerationContext, type GenerationInputs } from '../lib/engine/generation/inputs'
import { cancelDeferredTask } from '../lib/engine/generation/scheduler'
import { Llama } from '../lib/engine/Local/LlamaLocal'
import { buildLocalPayload } from '../lib/engine/Local/payload'
import {
    generateSummary,
    maybeGenerateSummary,
    discardSummary,
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
jest.mock('../lib/engine/API/APIBuilder', () => ({ buildAndSendRequest: jest.fn() }))
jest.mock('../lib/engine/Local/LlamaLocal', () => ({
    Llama: { useLlamaModelStore: { getState: jest.fn() } },
}))
jest.mock('../lib/engine/Local/payload', () => ({ buildLocalPayload: jest.fn() }))
jest.mock('../lib/engine/generation/inputs', () => ({
    captureGenerationInputs: jest.fn(),
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
            attempt_count: 0,
            start_entry_id: messages[0].id,
            end_entry_id: messages.at(-1)!.id,
            eligible_end_id: messages.at(-1)!.id,
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

test('discarding a trimmed chunk suppresses the same unchanged automatic candidate', () => {
    generateSummary(1, { inputs })
    mockRows.get(1).end_entry_id = 1
    discardSummary(1)
    expect(generateSummary(1, { inputs, automatic: true })).toBeUndefined()
    expect(mockRuns).toHaveLength(1)
})

test('automatic continuation is opt-in, bounded, and respects Later and cancellation', () => {
    generateSummary(1, { inputs })
    Object.assign(mockRows.get(1), {
        content: 'Partial',
        error: 'Output limit reached',
        attempt_count: 1,
    })
    useContextStatsState.setState({ chats: { 1: { total: 90, capacity: 100 } as any } })
    maybeGenerateSummary(inputs)
    expect(mockRuns).toHaveLength(1)
    settings.autoContinueDrafts = true
    mockRows.get(1).notice_dismissed = true
    maybeGenerateSummary(inputs)
    expect(mockRuns).toHaveLength(1)
    mockRows.get(1).notice_dismissed = false
    mockRows.get(1).error = 'Cancelled'
    maybeGenerateSummary(inputs)
    expect(mockRuns).toHaveLength(1)
    mockRows.get(1).error = 'Output limit reached'
    maybeGenerateSummary(inputs)
    expect(mockRuns).toHaveLength(2)
    mockRows.get(1).error = 'Output limit reached'
    maybeGenerateSummary(inputs)
    expect(mockRuns).toHaveLength(2)
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
        if (text === 'Short factual memory.' && ++finalTokenizations === 2) controller.abort()
        return Math.ceil(text.length / 4)
    }
    generateSummary(1, { inputs })
    await expect(mockRuns[0](controller.signal)).rejects.toThrow('Cancelled')
    expect(getSummary(1)?.status).toBe('draft')
})
