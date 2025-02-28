import { Logger } from '@lib/state/Logger'
import { fetch } from 'expo/fetch'

type SSEValues = {
    endpoint: string
    method: 'POST' | 'GET'
    body: string
    headers: any
}

export class SSEFetch {
    private abortController: AbortController = new AbortController()
    private decoder = new TextDecoder()
    private onEvent = (data: string) => {}
    private onError = () => {}
    private onClose = () => {}
    private closeStream = () => {}

    public abort() {
        this.abortController.abort()
        this.closeStream()
        this.closeStream = () => {}
    }

    public async start(values: SSEValues) {
        this.abortController = new AbortController()
        const body = values.method === 'POST' ? { body: values.body } : {}

        try {
            const res = await fetch(values.endpoint, {
                signal: this.abortController.signal,
                method: values.method,
                headers: values.headers,
                ...body,
            })

            if (res.status !== 200 || !res.body) {
                Logger.error(await res.text())
                return this.onError()
            }
            this.closeStream = res.body.cancel
            for await (const chunk of res.body) {
                const data = this.decoder.decode(chunk)
                const output = parseSSE(data)
                output.forEach((item) => this.onEvent(item))
            }
        } catch (e) {
            if (this.abortController.signal.aborted) {
                Logger.debug('Abort caught')
            }
            Logger.error('Request Failed: ' + e)
        } finally {
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

function parseSSE(message: string) {
    const output: string[] = []
    const lines = message.split(/\n/)
    for (const line of lines) {
        // For some APIs like Ollama, they use a ndjson stream
        if (line.startsWith('{')) {
            try {
                JSON.parse(line)
                output.push(line)
            } catch (e) {
                continue
            }
        }
        const colonIndex = line.indexOf(':')
        if (colonIndex === 0) continue
        const field = colonIndex > 0 ? line.slice(0, colonIndex).trim() : line.trim()
        const value = colonIndex > 0 ? line.slice(colonIndex + 1).trim() : ''
        if (field !== 'data' || value.startsWith('[DONE]')) continue
        output.push(value)
    }

    return output
}
