import { AccumulatedToolCall, ToolCallChunk } from './ToolTypes'

export class ToolCallAccumulator {
    private toolCalls: Map<number, AccumulatedToolCall> = new Map()
    private finishReason: string | null = null

    /**
     * Process a single parsed SSE chunk from an OpenAI-compatible streaming response.
     * Returns extracted text content (if any).
     */
    processChunk(parsed: any): { text: string | null } {
        const choice = parsed?.choices?.[0]
        if (!choice) return { text: null }

        if (choice.finish_reason) {
            this.finishReason = choice.finish_reason
        }

        const delta = choice.delta
        if (!delta) return { text: null }

        const text = delta.content ?? null

        if (delta.tool_calls && Array.isArray(delta.tool_calls)) {
            for (const chunk of delta.tool_calls) {
                this.accumulateToolCallChunk(chunk as ToolCallChunk)
            }
        }

        return { text }
    }

    private accumulateToolCallChunk(chunk: ToolCallChunk): void {
        const existing = this.toolCalls.get(chunk.index)
        if (!existing) {
            this.toolCalls.set(chunk.index, {
                id: chunk.id ?? '',
                type: 'function',
                function: {
                    name: chunk.function?.name ?? '',
                    arguments: chunk.function?.arguments ?? '',
                },
            })
        } else {
            if (chunk.id) existing.id = chunk.id
            if (chunk.function?.name) existing.function.name += chunk.function.name
            if (chunk.function?.arguments)
                existing.function.arguments += chunk.function.arguments
        }
    }

    /**
     * Returns true if the stream ended with tool calls.
     * Checks both finish_reason and presence of accumulated tool calls,
     * since some APIs may use 'stop' as finish_reason even for tool calls.
     */
    isToolCall(): boolean {
        if (this.toolCalls.size === 0) return false
        return this.finishReason === 'tool_calls' || this.finishReason === 'stop'
    }

    getToolCalls(): AccumulatedToolCall[] {
        return Array.from(this.toolCalls.values())
    }

    getFinishReason(): string | null {
        return this.finishReason
    }

    reset(): void {
        this.toolCalls.clear()
        this.finishReason = null
    }
}
