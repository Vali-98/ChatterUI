import { AuthorNotes } from '@lib/state/AuthorNotes'
import { Chats } from '@lib/state/Chat'

import type { ContextBuilderParams, ContextMessage } from './API/ContextBuilder'

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

const AUTHOR_NOTE_NAME = 'author_notes'
const createAuthorNotesDataSource = async (): Promise<DataSource | undefined> => {
    const { id: chatId } = Chats.useChatState.getState()
    if (!chatId) return
    const chatData = await Chats.db.query.chatShallow(chatId)
    if (!chatData) return
    const characterId = chatData.character_id

    const activeNotes = await AuthorNotes.db.query.getActiveNotes(characterId, chatId)
    if (!activeNotes || activeNotes.length === 0) return

    const tokenTotal = activeNotes.reduce((a, b) => a + (b.token_length ?? 0), 0)
    const dataSourceResults: DataSourceResult[] = activeNotes.map((item) => ({
        content: item.content,
        source: AUTHOR_NOTE_NAME,
        tokenLength: item.token_length ?? 0,
        position: {
            type: 'index',
            location: item.depth ?? 0,
        },
    }))

    return {
        name: AUTHOR_NOTE_NAME,
        priority: 1,
        tokenBudget: tokenTotal,
        retrieve: async (params) => {
            return dataSourceResults
        },
    }
}

export const getDataSources = async (): Promise<DataSource[]> => {
    let dataSources = [createExampleDataSource()]
    const authorNotesSource = await createAuthorNotesDataSource()
    if (authorNotesSource) dataSources.push(authorNotesSource)
    return dataSources
}
