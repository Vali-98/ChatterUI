import { Logger } from '@lib/state/Logger'

import { AccumulatedToolCall, ToolExecutionResult } from './ToolTypes'

export type ToolHandler = (args: Record<string, any>) => Promise<string>

const builtinTools: Map<string, ToolHandler> = new Map()

export function registerBuiltinTool(name: string, handler: ToolHandler): void {
    builtinTools.set(name, handler)
}

export async function executeTool(toolCall: AccumulatedToolCall): Promise<ToolExecutionResult> {
    const handler = builtinTools.get(toolCall.function.name)
    if (!handler) {
        Logger.warn(`Unknown tool: "${toolCall.function.name}"`)
        return {
            tool_call_id: toolCall.id,
            name: toolCall.function.name,
            content: `Error: Unknown tool "${toolCall.function.name}"`,
            is_error: true,
        }
    }
    try {
        const args = JSON.parse(toolCall.function.arguments)
        const result = await handler(args)
        return {
            tool_call_id: toolCall.id,
            name: toolCall.function.name,
            content: result,
            is_error: false,
        }
    } catch (e: any) {
        Logger.error(`Tool execution error (${toolCall.function.name}): ${e}`)
        return {
            tool_call_id: toolCall.id,
            name: toolCall.function.name,
            content: `Error executing tool: ${e?.message ?? e}`,
            is_error: true,
        }
    }
}

export async function executeToolCalls(
    toolCalls: AccumulatedToolCall[]
): Promise<ToolExecutionResult[]> {
    return Promise.all(toolCalls.map(executeTool))
}
