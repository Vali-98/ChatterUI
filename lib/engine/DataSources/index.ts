import { Tokenizer } from '@lib/engine/Tokenizer'
import { AuthorNotes } from '@lib/state/AuthorNotes'
import { Chats } from '@lib/state/chat'
import { replaceMacros, type MacroValues } from '@lib/state/Macros'

import createLorebookDataSource from './lorebookSource'
import { DataSource, DataSourceResult } from './types'

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

        const { characterCounts } = cache
        const tokenLength = characterCounts.exampleTokens

        if (currentLength + tokenLength > maxLength) {
            return []
        }

        return [
            {
                content: replaceMacros(examples, params.macros),
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
const createAuthorNotesDataSource = async (
    chatId = Chats.useChatState.getState().id,
    options?: SourceOptions
): Promise<DataSource | undefined> => {
    if (!chatId) return
    const chatData = await Chats.db.query.chatRow(chatId)
    if (!chatData) return
    const characterId = chatData.character_id

    const activeNotes = await AuthorNotes.db.query.getActiveNotes(characterId, chatId)
    if (!activeNotes || activeNotes.length === 0) return

    const tokenize = options?.tokenizer ?? Tokenizer.getTokenizer()
    const dataSourceResults: DataSourceResult[] = await Promise.all(
        activeNotes.map(async (item) => {
            const content = replaceMacros(item.content, options?.macros)
            return {
                content: content,
                source: AUTHOR_NOTE_NAME,
                tokenLength: await tokenize(content),
                position: { type: 'index' as const, location: item.depth ?? 0 },
            }
        })
    )
    const tokenTotal = dataSourceResults.reduce((total, item) => total + item.tokenLength, 0)

    return {
        name: AUTHOR_NOTE_NAME,
        priority: 1,
        tokenBudget: tokenTotal,
        retrieve: async (params) => {
            return dataSourceResults
        },
    }
}

export type SourceOptions = { macros: MacroValues; tokenizer: (text: string) => Promise<number> }

export const getDataSources = async (
    chatId?: number,
    options?: SourceOptions
): Promise<DataSource[]> => {
    const dataSources = [createExampleDataSource()]
    const [authorNotesSource, lorebooks] = await Promise.all([
        createAuthorNotesDataSource(chatId, options),
        createLorebookDataSource(),
    ])
    if (authorNotesSource) dataSources.push(authorNotesSource)

    if (lorebooks) {
        dataSources.push(...lorebooks)
    }

    return dataSources
}
