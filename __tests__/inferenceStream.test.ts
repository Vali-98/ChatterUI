import { fetch } from 'expo/fetch'
import { TextDecoder, TextEncoder } from 'util'

import { SSEFetch } from '../lib/engine/SSEFetch'

jest.mock('expo/fetch', () => ({ fetch: jest.fn() }))
jest.mock('../lib/state/Logger', () => ({ Logger: { error: jest.fn() } }))
Object.assign(global, { TextEncoder, TextDecoder })
const encode = (text: string) => new TextEncoder().encode(text)
const values = {
    signal: new AbortController().signal,
    endpoint: 'https://example.test',
    method: 'POST' as const,
    body: '{}',
    headers: {},
}

const respond = (chunks: Uint8Array[], status = 200) => {
    const reader = {
        read: jest.fn(async () =>
            chunks.length ? { value: chunks.shift(), done: false } : { done: true }
        ),
        cancel: jest.fn(async () => {}),
    }
    jest.mocked(fetch).mockResolvedValue({
        ok: status === 200,
        status,
        body: { getReader: () => reader },
        text: async () => 'error body',
    } as unknown as Awaited<ReturnType<typeof fetch>>)
    return reader
}

beforeEach(() => jest.resetAllMocks())

test('decodes UTF-8 and SSE records split at every byte', async () => {
    respond(
        Array.from(encode('data: {"text":"hello 😃"}\r\n\r\ndata: [DONE]\r\n\r\n')).map((byte) =>
            Uint8Array.of(byte)
        )
    )
    const stream = new SSEFetch()
    const output = jest.fn()
    stream.setOnEvent(output)
    await stream.start(values)
    expect(output.mock.calls).toEqual([['{"text":"hello 😃"}']])
})

test('handles multiple records, comments, multiline SSE data, and a trailing event', async () => {
    respond([
        encode(
            ': ping\r\nevent: message\r\ndata: {"a":1,\r\ndata: "b":2}\r\n\r\ndata: {"last":true}'
        ),
    ])
    const stream = new SSEFetch()
    const output: string[] = []
    stream.setOnEvent((text) => output.push(text))
    await stream.start(values)
    expect(output.map((text) => JSON.parse(text))).toEqual([{ a: 1, b: 2 }, { last: true }])
})

test('retains split NDJSON and flushes its final line without a newline', async () => {
    respond([encode('{"text":"hel'), encode('lo"}\n{"text":"last"}')])
    const stream = new SSEFetch()
    const output = jest.fn()
    stream.setOnEvent(output)
    await stream.start(values)
    expect(output.mock.calls).toEqual([['{"text":"hello"}'], ['{"text":"last"}']])
})

test('DONE ends the stream without delivering later records', async () => {
    const reader = respond([encode('data: [DONE]\n\ndata: {"ignored":true}\n\n')])
    const stream = new SSEFetch()
    const output = jest.fn()
    stream.setOnEvent(output)
    await stream.start(values)
    expect(output).not.toHaveBeenCalled()
    expect(reader.read).toHaveBeenCalledTimes(1)
    expect(reader.cancel).toHaveBeenCalledTimes(1)
})

test.each(['http', 'network', 'truncated'])(
    '%s failure reports an error and closes once',
    async (kind) => {
        if (kind === 'http') respond([], 403)
        if (kind === 'network') jest.mocked(fetch).mockRejectedValue(new Error('offline'))
        if (kind === 'truncated') respond([encode('{"text":')])
        const stream = new SSEFetch()
        const error = jest.fn()
        const close = jest.fn()
        stream.setOnError(error)
        stream.setOnClose(close)
        await stream.start(values)
        expect(error).toHaveBeenCalledTimes(1)
        expect(close).toHaveBeenCalledTimes(1)
    }
)

test('an already cancelled request never fetches and closes without an error', async () => {
    const controller = new AbortController()
    controller.abort()
    const stream = new SSEFetch()
    const error = jest.fn()
    const close = jest.fn()
    stream.setOnError(error)
    stream.setOnClose(close)
    await stream.start({ ...values, signal: controller.signal })
    expect(fetch).not.toHaveBeenCalled()
    expect(error).not.toHaveBeenCalled()
    expect(close).toHaveBeenCalledTimes(1)
})

test('in-flight abort cancels the reader and closes without reporting a network error', async () => {
    let finishRead!: (result: { done: boolean }) => void
    const reader = {
        read: jest.fn(
            () =>
                new Promise((resolve) => {
                    finishRead = resolve
                })
        ),
        cancel: jest.fn(async () => {
            finishRead?.({ done: true })
        }),
    }
    jest.mocked(fetch).mockResolvedValue({
        ok: true,
        status: 200,
        body: { getReader: () => reader },
    } as unknown as Awaited<ReturnType<typeof fetch>>)
    const stream = new SSEFetch()
    const error = jest.fn()
    const close = jest.fn()
    stream.setOnError(error)
    stream.setOnClose(close)
    const pending = stream.start(values)
    for (let i = 0; i < 10 && !reader.read.mock.calls.length; i++) await Promise.resolve()
    expect(reader.read).toHaveBeenCalledTimes(1)
    stream.abort()
    await pending
    expect(reader.cancel).toHaveBeenCalled()
    expect(error).not.toHaveBeenCalled()
    expect(close).toHaveBeenCalledTimes(1)
})
