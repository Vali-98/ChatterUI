export type OpenAIToolDefinition = {
    type: 'function'
    function: {
        name: string
        description: string
        parameters: object
    }
}

export type ToolCallChunk = {
    index: number
    id?: string
    function?: {
        name?: string
        arguments?: string
    }
}

export type AccumulatedToolCall = {
    id: string
    type: 'function'
    function: {
        name: string
        arguments: string
    }
}

export type ToolExecutionResult = {
    tool_call_id: string
    name: string
    content: string
    is_error: boolean
}
