import { useMMKVBoolean } from 'react-native-mmkv'

import { AppSettings } from '@lib/constants/GlobalValues'
import { SamplerID } from '@lib/constants/SamplerData'
import { useActiveConnectionTemplate } from '@lib/engine/API/connectionStore'
import { getSystemPrompt } from '@lib/engine/API/ContextBuilder'
import {
    contextAuthorNotes,
    contextHistory,
    contextLorebooks,
} from '@lib/queries/contextAllocation'
import { useAppMode } from '@lib/state/AppMode'
import { Characters } from '@lib/state/characters'
import { Chats } from '@lib/state/chat'
import { defaultSystemPromptFormat, Instructs, type InstructTokenCache } from '@lib/state/Instructs'
import { useCurrentSampler } from '@lib/state/samplerStore'
import { summaryList } from '@lib/summaries/db'
import { usableSummariesBefore } from '@lib/summaries/history'
import { useSummarySettingsStore } from '@lib/summaries/settingsStore'
import { contextAllocation } from '@lib/utils/contextAllocation'
import { applyMacros, createMacroValues } from '@lib/utils/Macros'

import { useContextLimit } from './ContextLimit'
import { useLiveQuerySync } from './liveQuery'

export const useContextAllocation = (generatedLength?: number) => {
    const chatId = Chats.useChatState((state) => state.id)
    const capacity = useContextLimit()
    const sampler = useCurrentSampler()
    const response = generatedLength ?? sampler?.data[SamplerID.GENERATED_LENGTH] ?? 0
    const { appMode } = useAppMode()
    const { apiConfig } = useActiveConnectionTemplate()
    const [useModelTemplate] = useMMKVBoolean(AppSettings.UseModelTemplate)
    const textMode =
        appMode === 'local'
            ? !useModelTemplate
            : apiConfig?.request.completionType.type === 'textCompletions'
    const character = Characters.useCharacterState((state) => state.card)
    const user = Characters.useUserStore((state) => state.card)
    const instruct = Instructs.useInstruct((state) => state.data) ?? Instructs.defaultInstruct
    const summariesEnabled = useSummarySettingsStore((state) => state.enabled)
    const now = new Date()
    const macros = createMacroValues({ char: character?.name ?? '', user: user?.name ?? '' }, now)
    const estimate = (text?: string) => Math.ceil(applyMacros(text ?? '', macros).length / 4)
    const { data: messages } = useLiveQuerySync(contextHistory(chatId ?? -1), {
        key: ['allocation-history', chatId],
        enabled: chatId !== undefined,
        watch: [{ table: 'chat_entries' }, { table: 'chat_swipes' }, { table: 'swipe_reasoning' }],
    })
    const { data: notes } = useLiveQuerySync(contextAuthorNotes(chatId, character?.id), {
        key: ['allocation-notes', chatId, character?.id],
        watch: [{ table: 'author_notes' }],
    })
    const { data: books } = useLiveQuerySync(contextLorebooks(), {
        key: ['allocation-lorebooks'],
        watch: [{ table: 'lorebooks' }, { table: 'lorebook_entries' }],
    })
    const { data: summaries } = useLiveQuerySync(summaryList(chatId ?? -1), {
        key: ['allocation-summaries', chatId],
        enabled: summariesEnabled && chatId !== undefined,
        watch: [{ table: 'chat_summaries' }],
    })
    const cache: InstructTokenCache = {
        characterName: character?.name ?? '',
        userName: user?.name ?? '',
        system_prompt_length: estimate(instruct.system_prompt),
        system_prefix_length: estimate(instruct.system_prefix),
        system_suffix_length: estimate(instruct.system_suffix),
        input_prefix_length: estimate(instruct.input_prefix),
        input_suffix_length: estimate(instruct.input_suffix),
        output_prefix_length: estimate(instruct.output_prefix),
        output_suffix_length: estimate(instruct.output_suffix),
        last_output_prefix_length: estimate(instruct.last_output_prefix),
        user_alignment_message_length: estimate(instruct.user_alignment_message),
    }
    const format = instruct.system_prompt_format ?? defaultSystemPromptFormat
    const prompt = format
        ? getSystemPrompt({
              instruct: { ...instruct, system_prompt_format: format },
              character: character,
              user: user,
              characterCounts: {
                  otherParticipantName: user?.name ?? '',
                  descriptionTokens: estimate(character?.description),
                  personalityTokens: estimate(character?.personality),
                  scenarioTokens: estimate(character?.scenario),
                  exampleTokens: estimate(character?.mes_example),
              },
              userCounts: {
                  otherParticipantName: character?.name ?? '',
                  descriptionTokens: estimate(user?.description),
                  personalityTokens: estimate(user?.personality),
                  scenarioTokens: estimate(user?.scenario),
                  exampleTokens: estimate(user?.mes_example),
              },
              instructCache: cache,
              usePrefix: textMode,
              useSuffix: false,
              macroValues: macros,
          })
        : { components: [] }
    const system = prompt.components.map((item) => ({ key: item.key, tokens: item.tokens }))
    system.push({
        key: 'systemFormatting',
        tokens:
            estimate(
                prompt.components.reduce(
                    (text, item) => text.split(`{{${item.key}}}`).join(''),
                    format
                )
            ) + (textMode ? cache.system_suffix_length : 0),
    })
    const cutoff = messages.filter((message) => !message.is_user && message.has_content).at(-2)?.id
    const selected = summariesEnabled ? usableSummariesBefore(cutoff, summaries) : []
    const raw = messages.filter(
        (message) =>
            !selected.some(
                (summary) =>
                    message.id >= summary.start_entry_id && message.id <= summary.end_entry_id
            )
    )
    const includeReasoning = !instruct.hide_think_tags && (appMode === 'local' || textMode)
    const timestampTokens = estimate(`[${now.toDateString()} ${now.toLocaleTimeString()}]\n`)
    let formatting = textMode
        ? selected.length * (cache.input_prefix_length + cache.input_suffix_length)
        : 0
    for (const [index, message] of raw.entries()) {
        if (textMode)
            formatting += message.is_user
                ? cache.input_prefix_length + cache.input_suffix_length
                : index === raw.length - 1
                  ? cache.last_output_prefix_length
                  : cache.output_prefix_length + cache.output_suffix_length
        if (instruct.names) formatting += estimate(`${message.name}: `)
        if (instruct.timestamp) formatting += timestampTokens
    }
    const noteTokens = (scope: 'global' | 'character' | 'chat') =>
        notes
            .filter((note) =>
                scope === 'chat'
                    ? note.chat_id !== null
                    : scope === 'character'
                      ? note.character_id !== null
                      : note.chat_id === null && note.character_id === null
            )
            .reduce(
                (total, note) =>
                    total +
                    (applyMacros(note.content, macros) === note.content
                        ? (note.token_length ?? estimate(note.content))
                        : estimate(note.content)),
                0
            )
    return contextAllocation(
        {
            system: system,
            history: [
                {
                    key: 'messages',
                    tokens: raw.reduce(
                        (total, message) =>
                            total + (message.token_length ?? Math.ceil(message.content_length / 4)),
                        0
                    ),
                },
                {
                    key: 'summaries',
                    tokens: selected.reduce(
                        (total, summary) =>
                            total +
                            estimate(`[Summary of earlier conversation]\n${summary.content}`),
                        0
                    ),
                },
                {
                    key: 'reasoning',
                    tokens: includeReasoning
                        ? raw.reduce(
                              (total, message) => total + Math.ceil(message.reasoning_length / 4),
                              0
                          )
                        : 0,
                },
                { key: 'messageFormatting', tokens: formatting },
            ],
            reserved: [
                { key: 'response', tokens: response },
                { key: 'globalNotes', tokens: noteTokens('global') },
                { key: 'characterNotes', tokens: noteTokens('character') },
                { key: 'chatNotes', tokens: noteTokens('chat') },
            ],
        },
        capacity,
        [
            ...books.map((book) => ({
                key: 'lorebooks',
                label: book.name,
                tokens: book.token_budget ?? 0,
            })),
            ...(instruct.examples && character?.mes_example
                ? [{ key: 'examples', tokens: estimate(character.mes_example) }]
                : []),
        ]
    )
}
