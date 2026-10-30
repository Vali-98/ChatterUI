import { fetch as streamFetch } from 'expo/fetch'
import { TextEncoder, TextDecoder } from 'util'

import { APIBuilderParams, buildAndSendRequest } from '../lib/engine/API/APIBuilder'
import { buildContext } from '../lib/engine/API/ContextBuilder'
import { defaultTemplates } from '../lib/engine/API/DefaultAPI'
import { buildRequest } from '../lib/engine/API/RequestBuilder'
import { Logger } from '../lib/state/Logger'

jest.mock('expo/fetch', () => ({ fetch: jest.fn() }))
jest.mock('expo-application', () => ({ nativeApplicationVersion: 'test' }))
jest.mock('i18next', () => ({ t: (key: string) => key }))
jest.mock('../lib/engine/API/ContextBuilder', () => ({ buildContext: jest.fn() }))
jest.mock('../lib/engine/API/RequestBuilder', () => ({ buildRequest: jest.fn() }))
jest.mock('../lib/state/Logger', () => ({ Logger: { errorToast: jest.fn(), error: jest.fn() } }))
jest.mock('../lib/storage/MMKV', () => ({ mmkv: { getBoolean: () => false } }))
Object.assign(global, { TextEncoder, TextDecoder })

const parameters = () =>
    ({
        apiConfig: JSON.parse(JSON.stringify(defaultTemplates[0])),
        apiValues: { ...defaultTemplates[0].defaultValues, configName: 'OpenAI' },
        signal: new AbortController().signal,
        stopSequence: [],
        onData: jest.fn(),
        onEnd: jest.fn(),
        stopGenerating: jest.fn(),
    }) as unknown as APIBuilderParams & {
        onData: jest.Mock
        onEnd: jest.Mock
        stopGenerating: jest.Mock
    }

const respond = (records: unknown[], status = 200) => {
    const bytes = new TextEncoder().encode(
        records.map((record) => `data: ${JSON.stringify(record)}\n\n`).join('')
    )
    let sent = false
    jest.mocked(streamFetch).mockResolvedValue({
        ok: status === 200,
        status,
        text: async () => 'failed',
        body: {
            getReader: () => ({
                read: async () =>
                    sent ? { done: true } : ((sent = true), { value: bytes, done: false }),
                cancel: async () => {},
            }),
        },
    } as unknown as Awaited<ReturnType<typeof streamFetch>>)
}

beforeEach(() => {
    jest.resetAllMocks()
    jest.mocked(buildContext).mockResolvedValue('prompt')
    jest.mocked(buildRequest).mockResolvedValue({ model: 'test' })
})

afterEach(() => jest.useRealTimers())

test('a record can emit reasoning and text, in reasoning-first order', async () => {
    const params = parameters()
    params.apiConfig.request.reasoningParsePattern = 'choices.0.delta.reasoning'
    respond([{ choices: [{ delta: { content: 'answer', reasoning: 'thought' } }] }])
    const request = await buildAndSendRequest(params)
    await request.done
    expect(params.onData.mock.calls.map(([event]) => event)).toEqual([
        { type: 'reasoning', content: 'thought' },
        { type: 'text', content: 'answer' },
    ])
    expect(params.stopGenerating).toHaveBeenCalledTimes(1)
    expect(params.stopGenerating).toHaveBeenCalledWith('completed')
})

test('stop strings spanning deltas are removed without dropping ordinary suffixes', async () => {
    const params = parameters()
    params.stopSequence = ['.END']
    respond(['hello .EN', 'D world .E'].map((content) => ({ choices: [{ delta: { content } }] })))
    const request = await buildAndSendRequest(params)
    await request.done
    expect(params.onData.mock.calls.map(([event]) => event.content).join('')).toBe(
        'hello  world .E'
    )
})

test.each(['http', 'provider', 'network'])(
    '%s errors finalize once and do not invoke successful completion',
    async (kind) => {
        const params = parameters()
        respond(
            kind === 'provider' ? [{ error: { message: 'bad request' } }] : [],
            kind === 'http' ? 500 : 200
        )
        if (kind === 'network') jest.mocked(streamFetch).mockRejectedValue(new Error('offline'))
        const request = await buildAndSendRequest(params)
        await request.done
        expect(params.stopGenerating).toHaveBeenCalledTimes(1)
        expect(params.stopGenerating).toHaveBeenCalledWith('failed')
        expect(params.onEnd).not.toHaveBeenCalled()
    }
)

test('completion waits for persistence before invoking its successful follow-up', async () => {
    const params = parameters()
    let finishSave!: () => void
    params.stopGenerating.mockReturnValue(
        new Promise<void>((resolve) => {
            finishSave = resolve
        })
    )
    respond([])
    const request = await buildAndSendRequest(params)
    for (let i = 0; i < 8; i++) await Promise.resolve()
    expect(params.stopGenerating).toHaveBeenCalledTimes(1)
    expect(params.onEnd).not.toHaveBeenCalled()
    finishSave()
    await request.done
    expect(params.onEnd).toHaveBeenCalledTimes(1)
})

test.each([true, false])(
    'request failures respect showErrorToast=%s without hiding failure',
    async (showErrorToast) => {
        const params = parameters()
        respond([], 500)
        await buildAndSendRequest({ ...params, showErrorToast }).done
        expect(params.stopGenerating).toHaveBeenCalledWith('failed')
        expect(params.onEnd).not.toHaveBeenCalled()
        if (showErrorToast) expect(Logger.errorToast).toHaveBeenCalled()
        else {
            expect(Logger.errorToast).not.toHaveBeenCalled()
            expect(Logger.error).toHaveBeenCalled()
        }
    }
)

test('cancellation during context building prevents a network request', async () => {
    const params = parameters()
    const controller = new AbortController()
    params.signal = controller.signal
    let finishContext!: (prompt: string) => void
    jest.mocked(buildContext).mockReturnValue(
        new Promise((resolve) => {
            finishContext = resolve
        })
    )
    const pending = buildAndSendRequest(params)
    controller.abort()
    finishContext('prompt')
    expect(pending.done).toBeInstanceOf(Promise)
    await pending.done
    expect(streamFetch).not.toHaveBeenCalled()
    expect(params.stopGenerating).toHaveBeenCalledWith('cancelled')
})

test('Horde failures settle their task and finalize once', async () => {
    const params = parameters()
    params.apiConfig.request.requestType = 'horde'
    const nativeFetch = jest.spyOn(global, 'fetch').mockRejectedValueOnce(new Error('offline'))
    try {
        const request = await buildAndSendRequest(params)
        await request.done
        expect(params.stopGenerating).toHaveBeenCalledWith('failed')
        expect(params.stopGenerating).toHaveBeenCalledTimes(1)
        expect(params.onEnd).not.toHaveBeenCalled()
    } finally {
        nativeFetch.mockRestore()
    }
})

test('Horde success emits its result and invokes the completion follow-up', async () => {
    jest.useFakeTimers()
    const params = parameters()
    params.apiConfig.request.requestType = 'horde'
    params.apiConfig.request.responseParsePattern = 'generations.0.text'
    const nativeFetch = jest
        .spyOn(global, 'fetch')
        .mockResolvedValueOnce({ status: 202, json: async () => ({ id: 'job' }) } as Response)
        .mockResolvedValueOnce({
            ok: true,
            json: async () => ({ done: true, generations: [{ text: 'answer' }] }),
        } as Response)
    try {
        const request = await buildAndSendRequest(params)
        await jest.advanceTimersByTimeAsync(5000)
        await request.done
        expect(params.onData).toHaveBeenCalledWith({ type: 'text', content: 'answer' })
        expect(params.stopGenerating).toHaveBeenCalledWith('completed')
        expect(params.onEnd).toHaveBeenCalledTimes(1)
    } finally {
        nativeFetch.mockRestore()
    }
})

test('aborting Horde wakes polling immediately and deletes the known remote job', async () => {
    jest.useFakeTimers()
    const params = parameters()
    params.apiConfig.request.requestType = 'horde'
    const nativeFetch = jest
        .spyOn(global, 'fetch')
        .mockResolvedValueOnce({ status: 202, json: async () => ({ id: 'job' }) } as Response)
        .mockResolvedValue({ ok: true } as Response)
    try {
        const request = await buildAndSendRequest(params)
        await jest.advanceTimersByTimeAsync(0)
        request.abort()
        await request.done
        expect(nativeFetch).toHaveBeenCalledWith(
            expect.stringContaining('/status/job'),
            expect.objectContaining({ method: 'DELETE' })
        )
        expect(params.stopGenerating).toHaveBeenCalledWith('cancelled')
        expect(params.onEnd).not.toHaveBeenCalled()
        expect(jest.getTimerCount()).toBe(0)
    } finally {
        nativeFetch.mockRestore()
    }
})

test('the handle exists immediately and abort cancels pending preparation', async () => {
    const params = parameters()
    let complete!: (text: string) => void
    jest.mocked(buildContext).mockReturnValueOnce(
        new Promise((resolve) => {
            complete = resolve
        })
    )
    const request = buildAndSendRequest(params)
    expect(typeof request.abort).toBe('function')
    expect(request.done).toBeInstanceOf(Promise)
    request.abort()
    complete('prompt')
    await request.done
    expect(streamFetch).not.toHaveBeenCalled()
    expect(params.stopGenerating).toHaveBeenCalledTimes(1)
    expect(params.stopGenerating).toHaveBeenCalledWith('cancelled')
})

test('preparation failure settles the same required done promise', async () => {
    const params = parameters()
    jest.mocked(buildContext).mockResolvedValueOnce(undefined)
    const request = buildAndSendRequest(params)
    await request.done
    expect(params.stopGenerating).toHaveBeenCalledTimes(1)
    expect(params.stopGenerating).toHaveBeenCalledWith('failed')
    expect(streamFetch).not.toHaveBeenCalled()
})

test('a request can omit hooks it does not need', async () => {
    const params = parameters()
    respond([])
    await buildAndSendRequest({ ...params, onEnd: undefined, stopGenerating: undefined }).done
})
