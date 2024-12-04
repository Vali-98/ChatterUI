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

    public abort() {
        this.abortController.abort()
    }

    public async start(values: SSEValues) {
        this.abortController = new AbortController()
        const body = values.method === 'POST' ? { body: values.body } : {}

        fetch(values.endpoint, {
            signal: this.abortController.signal,
            method: values.method,
            headers: values.headers,
            ...body,
        }).then(async (res) => {
            if (res.status !== 200 || !res.body) return this.onError()
            for await (const chunk of res.body) {
                if (this.abortController.signal.aborted) break
                const data = this.decoder.decode(chunk)
                const output = parseSSE(data)
                output.forEach((item) => this.onEvent(item))
            }
            this.onClose()
        })
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
