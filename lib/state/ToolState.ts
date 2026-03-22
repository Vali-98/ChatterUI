import { create } from 'zustand'

import { db as database } from '@db'
import { toolDefinitions, ToolDefinitionType } from 'db/schema'
import { Logger } from '@lib/state/Logger'
import { OpenAIToolDefinition } from '@lib/engine/Tools/ToolTypes'
import { BUILTIN_TOOL_DEFINITIONS } from '@lib/engine/Tools/builtins'
import { eq } from 'drizzle-orm'

type ToolStateProps = {
    tools: ToolDefinitionType[]
    loadTools: () => Promise<void>
    addTool: (tool: Omit<ToolDefinitionType, 'id' | 'created_at'>) => Promise<void>
    removeTool: (id: number) => Promise<void>
    updateTool: (id: number, updates: Partial<ToolDefinitionType>) => Promise<void>
    toggleTool: (id: number) => Promise<void>
    getToolsForCharacter: (characterId?: number) => ToolDefinitionType[]
    getToolsPayload: (characterId?: number) => OpenAIToolDefinition[]
}

export namespace ToolState {
    /**
     * Seeds built-in tool definitions into the DB if they don't exist yet,
     * then loads all tools into the store.
     */
    export const initializeTools = async () => {
        try {
            const existing = await database.query.toolDefinitions.findMany()
            const existingNames = new Set(existing.map((t) => t.name))

            for (const def of BUILTIN_TOOL_DEFINITIONS) {
                if (!existingNames.has(def.function.name)) {
                    await database.insert(toolDefinitions).values({
                        name: def.function.name,
                        description: def.function.description,
                        parameters_schema: def.function.parameters,
                        enabled: true,
                        builtin: true,
                        character_id: null,
                    })
                    Logger.info(`Seeded built-in tool: ${def.function.name}`)
                }
            }

            await useToolStore.getState().loadTools()
            Logger.info(
                `Tool definitions loaded: ${useToolStore.getState().tools.length} tool(s)`
            )
        } catch (e) {
            Logger.error('Failed to initialize tools: ' + e)
        }
    }

    export const useToolStore = create<ToolStateProps>()((set, get) => ({
        tools: [],

        loadTools: async () => {
            try {
                const allTools = await database.query.toolDefinitions.findMany()
                set({ tools: allTools })
            } catch (e) {
                Logger.error('Failed to load tool definitions: ' + e)
            }
        },

        addTool: async (tool) => {
            try {
                await database.insert(toolDefinitions).values(tool)
                await get().loadTools()
            } catch (e) {
                Logger.error('Failed to add tool: ' + e)
            }
        },

        removeTool: async (id) => {
            try {
                await database.delete(toolDefinitions).where(eq(toolDefinitions.id, id))
                await get().loadTools()
            } catch (e) {
                Logger.error('Failed to remove tool: ' + e)
            }
        },

        updateTool: async (id, updates) => {
            try {
                await database
                    .update(toolDefinitions)
                    .set(updates)
                    .where(eq(toolDefinitions.id, id))
                await get().loadTools()
            } catch (e) {
                Logger.error('Failed to update tool: ' + e)
            }
        },

        toggleTool: async (id) => {
            const tool = get().tools.find((t) => t.id === id)
            if (!tool) return
            await get().updateTool(id, { enabled: !tool.enabled })
        },

        getToolsForCharacter: (characterId?: number) => {
            return get().tools.filter(
                (t) =>
                    t.enabled &&
                    (t.character_id === null || t.character_id === characterId)
            )
        },

        getToolsPayload: (characterId?: number) => {
            const enabledTools = get().getToolsForCharacter(characterId)

            // Merge built-in definitions with DB-stored custom tools
            const payload: OpenAIToolDefinition[] = []

            for (const tool of enabledTools) {
                if (tool.builtin) {
                    // Find matching built-in definition
                    const builtin = BUILTIN_TOOL_DEFINITIONS.find(
                        (b) => b.function.name === tool.name
                    )
                    if (builtin) payload.push(builtin)
                } else {
                    payload.push({
                        type: 'function',
                        function: {
                            name: tool.name,
                            description: tool.description,
                            parameters: tool.parameters_schema,
                        },
                    })
                }
            }

            return payload
        },
    }))
}
