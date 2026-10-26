import { fetch } from 'expo/fetch'

import { Logger } from '@lib/state/Logger'

type SSEValues = {
    endpoint: string
    method: 'POST' | 'GET'
    body: string
    headers: Record<string, string>
    signal: AbortSignal
}

// Network chunks can end anywhere, including inside UTF-8 characters or JSON records.
class StreamRecords {
    private pending = ''
    private data: string[] = []
    done = false

    constructor(private readonly emit: (data: string) => void) {}

    push(text: string, final = false) {
        this.pending += text
        while (!this.done) {
            const newline = this.pending.search(/[\r\n]/)
            if (newline === -1) break
            if (!final && this.pending[newline] === '\r' && newline === this.pending.length - 1)
                break
            const width = this.pending.slice(newline, newline + 2) === '\r\n' ? 2 : 1
            const line = this.pending.slice(0, newline)
            this.pending = this.pending.slice(newline + width)
            this.line(line)
        }
        if (final && !this.done) {
            if (this.pending) this.line(this.pending)
            this.pending = ''
            this.dispatch()
        }
    }

    private line(line: string) {
        if (!line) return this.dispatch()
        if (line.startsWith(':')) return
        // Ollama and other NDJSON endpoints send one JSON object per line.
        if (line.trimStart().startsWith('{')) {
            JSON.parse(line)
            this.emit(line)
            return
        }
        const colon = line.indexOf(':')
        const field = colon === -1 ? line : line.slice(0, colon)
        let value = colon === -1 ? '' : line.slice(colon + 1)
        if (value.startsWith(' ')) value = value.slice(1)
        if (field === 'data') this.data.push(value)
    }

    private dispatch() {
        if (!this.data.length) return
        const data = this.data.join('\n')
        this.data = []
        if (data.trim() === '[DONE]') this.done = true
        else this.emit(data)
    }
}

export class SSEFetch {
    private abortController = new AbortController()
    private onEvent = (_data: string) => {}
    private onError = () => {}
    private onClose = () => {}
    private reader?: ReadableStreamDefaultReader<Uint8Array>
    private cancelled = false

    public abort() {
        this.cancelled = true
        this.abortController.abort()
        void this.reader?.cancel().catch(() => {})
    }

    public async start(values: SSEValues) {
        this.abortController = new AbortController()
        this.cancelled = false
        const decoder = new TextDecoder()
        const records = new StreamRecords((data) => this.onEvent(data))
        const abort = () => this.abort()
        values.signal.addEventListener('abort', abort)
        try {
            if (values.signal.aborted) {
                this.abort()
                return
            }
            const res = await fetch(values.endpoint, {
                signal: this.abortController.signal,
                method: values.method,
                headers: values.headers,
                ...(values.method === 'POST' ? { body: values.body } : {}),
            })
            if (!res.ok || !res.body) {
                throw new Error(`Status ${res.status}: ${await res.text()}`)
            }
            this.reader = res.body.getReader()
            while (!this.cancelled && !records.done) {
                const { value, done } = await this.reader.read()
                if (this.cancelled) break
                if (done) {
                    records.push(decoder.decode(), true)
                    break
                }
                records.push(decoder.decode(value, { stream: true }))
            }
        } catch (error) {
            if (!this.cancelled) {
                Logger.error('Request Failed: ' + error)
                this.onError()
            }
        } finally {
            values.signal.removeEventListener('abort', abort)
            try {
                await this.reader?.cancel()
            } catch {}
            this.reader = undefined
            this.onClose()
        }
    }

    public setOnEvent(callback: (data: string) => void) {
        this.onEvent = callback
    }
    public setOnError(callback: () => void) {
        this.onError = callback
    }
    public setOnClose(callback: () => void) {
        this.onClose = callback
    }
}
