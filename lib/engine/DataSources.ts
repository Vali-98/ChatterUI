import type { ContextBuilderParams, ContextMessage } from './API/ContextBuilder2'

export type DataSourceResult = {
    content: string
    source: string // for debugging
    tokenLength: number
    position:
        | {
              type: 'relative'
              location: 'afterLast' | 'beforeLast' | 'afterSystem'
          }
        | {
              type: 'index'
              location: number // if greater than context length, simply insert at start of conversation
          }
}

export type DataSource = {
    retrieve: (
        params: ContextBuilderParams,
        messages: ContextMessage[],
        maxLength: number,
        currentLength: number,
        tokenBudget: number,
        lastMessageReached: boolean
    ) => Promise<DataSourceResult[]>
    tokenBudget: number // if 0, opportunistic, otherwise reserve context for addition, passed into retrieve()
    priority: number // 0 = highest
    name: string // for debugging
}

export const createExampleDataSource = (): DataSource => ({
    name: 'character_examples',
    priority: 1000,
    tokenBudget: 0,

    retrieve: async (
        params,
        messages,
        maxLength,
        currentLength,
        tokenBudget,
        lastMessageReached
    ) => {
        if (!lastMessageReached) return []

        const { character, instruct, cache } = params
        if (!instruct.examples) return []

        const examples = character?.mes_example
        if (!examples) return []

        const { characterCache } = cache
        const tokenLength = characterCache.examples_length

        if (currentLength + tokenLength > maxLength) {
            return []
        }

        return [
            {
                content: examples,
                source: 'character_examples',
                tokenLength: tokenLength,
                position: {
                    type: 'relative',
                    location: 'afterSystem',
                },
            },
        ]
    },
})

export const getDataSources = async () => {
    const characterExampleSource = createExampleDataSource()
    return [characterExampleSource]
}
