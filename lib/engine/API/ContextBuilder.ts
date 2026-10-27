import { t } from 'i18next'

import {
    AppSettings,
    CONTINUATION_PROMPT_KEY,
    DEFAULT_CONTINUATION_PROMPT,
} from '@lib/constants/GlobalValues'
import { useTextFilterStore } from '@lib/hooks/TextFilter'
import { useAppModeStore } from '@lib/state/AppMode'
import { CharacterCard, CharacterTokenCounts } from '@lib/state/characters'
import { ChatMessage } from '@lib/state/chat'
import { defaultSystemPromptFormat, InstructTokenCache, InstructType } from '@lib/state/Instructs'
import { Logger } from '@lib/state/Logger'
import { getActiveMacros, replaceMacros } from '@lib/state/Macros'
import { mmkv } from '@lib/storage/MMKV'
import { readBase64Async } from '@lib/utils/File'
import { applyMacros, type MacroValues } from '@lib/utils/Macros'

import { APIConfiguration, APIValues } from './APIBuilder.types'
import type { DataSource, DataSourceResult } from '../DataSources/types'
import type { ContextStats } from '../generation/contextStatsState'

export type MessageLoader = {
    retrieve: (page: number) => Promise<ChatMessage[]> // must retrieve messages in chronological order from oldest to newest
    pageSize: number // we use this to determine if a last page has been reached, if (await retrieve()).length < pageSize
    initialPage: number // usually 0
}

export type TokenCache = {
    userCounts: CharacterTokenCounts
    characterCounts: CharacterTokenCounts
    instructCache: InstructTokenCache
}

const printContext = (context: string) => {
    if (!mmkv.getBoolean(AppSettings.PrintContext)) return
    Logger.info('Input Context')
    Logger.info(JSON.stringify(context))
}

export interface ContextBuilderParams {
    onContextStats?: (stats: ContextStats) => void
    summaryTokens?: Record<number, { summarizedMessages: number; rawHistory: number }>
    macros?: MacroValues
    textFilter?: Pick<ReturnType<typeof useTextFilterStore.getState>, 'sendFilteredText' | 'filter'>
    apiConfig: APIConfiguration
    apiValues: APIValues
    messages: ChatMessage[]
    character: CharacterCard
    instruct: InstructType
    user: CharacterCard
    tokenizer: (data: string, media_paths?: string[]) => Promise<number> | number
    chatTokenizer: (entry: ChatMessage, index: number) => Promise<number>
    maxLength: number
    cache: TokenCache
    includeInlineReasoning?: boolean
    bypassContextLength?: boolean
    messageLoader?: MessageLoader
    dataSources?: DataSource[]
}

type TextData = { type: 'input_text' | 'text'; text: string }
type ImageData = { type: 'image_url'; image_url: { url: string } }
type AudioData = { type: 'input_audio'; input_audio: { data: string; format: string } }

type ContentTypes = TextData | ImageData | AudioData

export type Message = { role: string; [x: string]: ContentTypes[] | string }

export const buildContext = async (params: ContextBuilderParams) => {
    const buildFn =
        params.apiConfig.request.completionType.type === 'chatCompletions'
            ? buildChatCompletionContext
            : buildTextCompletionContext
    const output = await buildFn(params)
    return output
}

export type ContextMessage = {
    role: 'user' | 'assistant'
    content: string
    attachments?: ContentTypes[]
}

export type CompletionState =
    'initial_truncated' | 'initial_completed' | 'loader_completed' | 'loader_truncated'

export const collectContext = async (params: ContextBuilderParams & { mode: 'chat' | 'text' }) => {
    const {
        apiConfig,
        messages,
        character,
        user,
        cache,
        instruct,
        tokenizer,
        chatTokenizer,
        maxLength,
        bypassContextLength,
        messageLoader,
        mode,
        dataSources,
    } = params

    const delta = performance.now()

    const { characterCounts, userCounts, instructCache } = cache

    const usePrefix = mode === 'text'
    const useSuffix = false

    const sortedDataSources = [...(dataSources ?? [])].sort((a, b) => a.priority - b.priority)

    let { systemPrompt, systemPromptLength } = getSystemPrompt({
        instruct: instruct,
        user: user,
        character: character,
        userCounts: userCounts,
        characterCounts: characterCounts,
        instructCache: instructCache,
        usePrefix: usePrefix,
        useSuffix: useSuffix,
        macroValues: params.macros,
    })

    systemPromptLength = await tokenizer(
        filterContextText(systemPrompt, instruct, params.textFilter)
    )
    if (mode === 'text') systemPromptLength += await tokenizer(instruct.system_suffix ?? '')
    if (systemPromptLength > maxLength && !bypassContextLength)
        Logger.warnToast(t('generation.warn.systemPromptExceedsContext'))

    const reservedBudget = sortedDataSources.reduce((acc, curr) => acc + curr.tokenBudget, 0)

    let totalLength = systemPromptLength + reservedBudget
    let historyTokens = 0
    let summaryTokens = 0
    let summarizedMessages = 0
    let rawSummaryTokens = 0
    let dataSourceTokens = 0

    let hasImage = false
    let completionState: CompletionState = 'initial_completed'

    const contextMessages: ContextMessage[] = []

    /**
     * Shared processor
     */
    const processMessage = async (
        message: ChatMessage,
        index: number,
        isLast: boolean
    ): Promise<boolean> => {
        const swipe = message.swipes.find((item) => item.active)
        if (!swipe) {
            Logger.errorToast(t('generation.warn.entryWithoutValidSwipeFound'))
            return false
        }
        const timestamp =
            message.id >= 0 && instruct.timestamp
                ? `[${swipe.send_date.toDateString()} ${swipe.send_date.toLocaleTimeString()}]\n`
                : ''
        const name = message.id >= 0 && instruct.names ? `${message.name}: ` : ''
        const role: 'user' | 'assistant' = message.is_user ? 'user' : 'assistant'
        // TODO: Native reasoning replay belongs to explicit provider/template capabilities.
        const reasoning =
            (mode === 'text' || params.includeInlineReasoning) &&
            !instruct.hide_think_tags &&
            swipe.reasoning?.content
                ? `<think>${swipe.reasoning.content}</think>\n`
                : ''
        if (!swipe.swipe && !reasoning && isLast) return true
        const content = filterContextText(
            replaceMacros(`${timestamp}${name}${reasoning}${swipe.swipe}`, params.macros),
            instruct,
            params.textFilter
        )
        const swipeLen = await chatTokenizer(message, index)
        const contentLength =
            content === swipe.swipe
                ? swipeLen
                : await tokenizer(
                      content,
                      message.attachments
                          .filter((item) => item.type === 'image')
                          .map((item) => item.uri)
                  )
        let instructLen = 0
        if (mode === 'text') {
            instructLen = message.is_user
                ? instructCache.input_prefix_length + instructCache.input_suffix_length
                : isLast
                  ? instructCache.last_output_prefix_length
                  : instructCache.output_prefix_length + instructCache.output_suffix_length
        }
        const shardLen = contentLength + instructLen
        if (totalLength + shardLen > maxLength && !bypassContextLength) return false

        let attachments: ContentTypes[] | undefined

        if (mode === 'chat' && apiConfig.request.completionType.type === 'chatCompletions') {
            const result = getValidAttachments(
                message,
                apiConfig.request.completionType,
                instruct,
                hasImage
            )

            hasImage = result.hasImageNew

            if (result.attachments.length > 0) {
                attachments = await Promise.all(
                    result.attachments.map(async (item) => {
                        const base64 = await readBase64Async(item.uri)

                        if (item.type === 'image') {
                            return {
                                type: 'image_url',
                                image_url: {
                                    url: `data:${item.mime_type};base64,${base64}`,
                                },
                            }
                        }

                        return {
                            type: 'input_audio',
                            input_audio: {
                                data: base64,
                                format:
                                    item.mime_type === 'audio/mpeg'
                                        ? 'mp3'
                                        : item.mime_type.split('/')[1],
                            },
                        }
                    })
                )
            }
        }

        contextMessages.push({ role, content, attachments })

        totalLength += shardLen
        const summary = params.summaryTokens?.[message.id]
        if (summary) {
            summaryTokens += shardLen
            summarizedMessages += summary.summarizedMessages
            rawSummaryTokens += summary.rawHistory
        } else historyTokens += shardLen

        return true
    }

    // initial message collector
    let index = messages.length - 1

    for (let i = messages.length - 1; i >= 0; i--) {
        const success = await processMessage(messages[i], index, i === messages.length - 1)

        if (!success) {
            completionState = 'initial_truncated'
            break
        }
        index--
    }

    if (messageLoader && completionState === 'initial_completed') {
        let page = messageLoader.initialPage
        while (true) {
            let batch: ChatMessage[] | null = null

            batch = await messageLoader.retrieve(page)

            for (let i = batch.length - 1; i >= 0; i--) {
                const success = await processMessage(batch[i], -1, false)
                if (!success) {
                    completionState = 'loader_truncated'
                    break
                }
            }

            if (completionState === 'loader_truncated') break

            if (batch.length < messageLoader.pageSize || batch.length === 0) {
                completionState = 'loader_completed'
                break
            }

            page++
        }
    }

    const lastMessageReached =
        completionState === 'loader_completed' || completionState === 'initial_completed'

    const pendingInsertions: DataSourceResult[] = []

    const runDataSources = async (sources: DataSource[]) => {
        for (const source of sources) {
            const remaining = maxLength - totalLength
            const opportunistic = source.tokenBudget === 0
            if (remaining <= 0 && opportunistic) {
                Logger.info(`[DataSource:${source.name}] skipped (no remaining budget)`)
                continue
            }

            const budget = opportunistic ? remaining : source.tokenBudget

            const results = await source.retrieve(
                params,
                [...contextMessages].reverse(),
                maxLength,
                totalLength,
                budget,
                lastMessageReached
            )
            // Release the reservation before charging the actual returned content.
            totalLength -= source.tokenBudget
            for (const result of results) {
                const separatorLength =
                    result.position.type === 'relative' &&
                    result.position.location === 'afterSystem'
                        ? await tokenizer('\n')
                        : 0
                const length = result.tokenLength + separatorLength
                if (totalLength + length > maxLength && !bypassContextLength) continue
                pendingInsertions.push(result)
                totalLength += length
                dataSourceTokens += length

                Logger.info(
                    `[DataSource:${source.name}] inserted ${result.tokenLength} tokens from ${result.source}`
                )
            }
        }
    }

    await runDataSources(sortedDataSources)

    contextMessages.reverse()

    const insertMessage = (index: number, message: ContextMessage) => {
        contextMessages.splice(index, 0, message)
    }

    for (const insertion of pendingInsertions) {
        const syntheticMessage: ContextMessage = {
            role: 'user',
            content: filterContextText(insertion.content, instruct, params.textFilter),
        }

        if (insertion.position.type === 'relative') {
            switch (insertion.position.location) {
                case 'afterLast':
                    contextMessages.push(syntheticMessage)
                    break

                case 'beforeLast':
                    contextMessages.splice(
                        Math.max(contextMessages.length - 1, 0),
                        0,
                        syntheticMessage
                    )
                    break

                case 'afterSystem':
                    systemPrompt += '\n' + insertion.content
                    break
            }

            continue
        }

        const index = insertion.position.location

        // Indexed insertions are depths measured back from the newest message.
        insertMessage(Math.max(0, contextMessages.length - index), syntheticMessage)
    }

    Logger.info(`Approximate Context Size: ${totalLength}`)
    Logger.info(`${(performance.now() - delta).toFixed(2)}ms`)

    params.onContextStats?.({
        total: totalLength,
        capacity: maxLength,
        response: 0,
        system: systemPromptLength,
        history: historyTokens,
        summaries: summaryTokens,
        dataSources: dataSourceTokens,
        summarizedMessages: summarizedMessages,
        rawHistory: historyTokens + rawSummaryTokens,
    })
    if (contextMessages.length === 0) warnNoMessages()
    return {
        systemPrompt: systemPrompt,
        messages: contextMessages,
    }
}

export const buildChatCompletionContext = async (params: ContextBuilderParams) => {
    if (params.apiConfig.request.completionType.type !== 'chatCompletions') return

    const { systemPrompt, messages } = await collectContext({
        ...params,
        mode: 'chat',
    })

    const feats = params.apiConfig.request.completionType

    const payload: Message[] = [
        {
            role: feats.systemRole,
            [feats.contentName]: filterContextText(
                systemPrompt,
                params.instruct,
                params.textFilter
            ),
        },
    ]

    for (const msg of messages) {
        if (msg.attachments?.length) {
            payload.push({
                role: msg.role === 'user' ? feats.userRole : feats.assistantRole,
                [feats.contentName]: [{ type: 'text', text: msg.content }, ...msg.attachments],
            })
        } else {
            payload.push({
                role: msg.role === 'user' ? feats.userRole : feats.assistantRole,
                [feats.contentName]: msg.content,
            })
        }
    }
    if (feats.endWithUserTurn && messages.at(-1)?.role === 'assistant') {
        payload.push({
            role: feats.userRole,
            [feats.contentName]:
                mmkv.getString(CONTINUATION_PROMPT_KEY)?.trim() || DEFAULT_CONTINUATION_PROMPT,
        })
    }
    printContext(
        JSON.stringify(
            payload.map((item) => {
                const content = item[feats.contentName]
                if (typeof content === 'string') return item
                else return content.filter((item) => item.type === 'text')
            })
        )
    )
    return payload
}

export const buildTextCompletionContext = async (params: ContextBuilderParams) => {
    const { systemPrompt, messages } = await collectContext({
        ...params,
        mode: 'text',
    })

    const { instruct } = params
    let hasMedia = false
    let output = systemPrompt + instruct.system_suffix
    let len = 0
    let endedAtAssistant = false
    for (const msg of messages) {
        let outPrefix = instruct.output_prefix
        let outSuffix = instruct.output_suffix
        if (len === messages.length - 1 && msg.role === 'assistant') {
            outPrefix = instruct.last_output_prefix
            outSuffix = ''
            endedAtAssistant = true
        }

        let shard = msg.role === 'user' ? instruct.input_prefix : outPrefix

        shard += msg.content

        shard += msg.role === 'user' ? instruct.input_suffix : outSuffix

        if (instruct.wrap && !endedAtAssistant) shard += '\n'
        if (!hasMedia && msg.attachments?.length) {
            hasMedia = true
        }
        output += shard
        len++
    }
    if (hasMedia) {
        Logger.errorToast('Text Completions does not support multimodal')
        if (useAppModeStore.getState().appMode === 'local') {
            Logger.warn(
                "[HINT] You probably have built-in templates disabled. Enable it in 'Formatting > Use Built-In Local Model' template"
            )
        }
    }

    if (!endedAtAssistant) output += instruct.last_output_prefix
    const result = filterContextText(output, instruct, params.textFilter)
    printContext(result)
    return result
}

const filterContextText = (
    text: string,
    instruct: InstructType,
    settings: Pick<
        ReturnType<typeof useTextFilterStore.getState>,
        'sendFilteredText' | 'filter'
    > = useTextFilterStore.getState()
) => {
    let result = text
    const { sendFilteredText, filter } = settings
    if (!sendFilteredText) {
        for (const pattern of filter) result = result.replace(new RegExp(pattern, 'gi'), '')
    }
    return result
}

const getValidAttachments = (
    entry: ChatMessage,
    config: {
        type: 'chatCompletions'
        userRole: string
        systemRole: string
        assistantRole: string
        contentName: string
        supportsAudio?: boolean
        supportsImages?: boolean
    },
    instruct: InstructType,
    hasImage: boolean
) => {
    // hasImage is used for last_image_only checking
    let hasImageNew = hasImage
    const audioAttachments = entry.attachments.filter(
        (item) => item.type === 'audio' && instruct.send_audio && config.supportsAudio
    )

    let imageAttachments: typeof entry.attachments = []
    if (instruct.send_images && config.supportsImages) {
        const images = entry.attachments.filter((item) => item.type === 'image')
        if (instruct.last_image_only && images.length > 0) {
            if (!hasImageNew) {
                hasImageNew = true
                imageAttachments = [images[0]]
            }
        } else {
            imageAttachments = images
        }
    }
    const attachments = [...audioAttachments, ...imageAttachments]
    return { hasImageNew, attachments }
}

export const getSystemPrompt = ({
    instruct,
    user,
    character,
    userCounts,
    characterCounts,
    instructCache,
    usePrefix = true,
    useSuffix = true,
    macroValues = getActiveMacros(),
}: {
    instruct: InstructType
    user?: CharacterCard
    character?: CharacterCard
    userCounts: CharacterTokenCounts
    characterCounts: CharacterTokenCounts
    instructCache: InstructTokenCache
    usePrefix?: boolean
    useSuffix?: boolean
    macroValues?: MacroValues
}) => {
    let systemPrompt = instruct.system_prompt_format
    if (systemPrompt === undefined) {
        Logger.warn('System Prompt Format is undefined, falling back to default')
        systemPrompt = defaultSystemPromptFormat
    }
    if (systemPrompt === '') {
        Logger.warn('System Prompt Format is blank')
    }

    let systemPromptLength = 0
    const macros = [
        {
            macro: '{{system_prefix}}',
            value: (usePrefix && instruct.system_prefix) || '',
            length: usePrefix ? instructCache.system_prefix_length : 0,
        },
        {
            macro: '{{system_suffix}}',
            value: (useSuffix && instruct.system_suffix) || '',
            length: useSuffix ? instructCache.system_suffix_length : 0,
        },
        {
            macro: '{{system_prompt}}',
            value: instruct.system_prompt ?? '',
            length: instructCache.system_prompt_length,
        },
        {
            macro: '{{character_desc}}',
            value: replaceMacros(character?.description ?? '', macroValues),
            length: characterCounts.descriptionTokens,
        },
        {
            macro: '{{user_desc}}',
            value: replaceMacros(user?.description ?? '', macroValues),
            length: userCounts.descriptionTokens,
        },
        {
            macro: '{{personality}}',
            value: instruct.personality
                ? replaceMacros(character?.personality ?? '', macroValues)
                : '',
            length: instruct.personality ? characterCounts.personalityTokens : 0,
        },
        {
            macro: '{{scenario}}',
            value: instruct.scenario ? replaceMacros(character?.scenario ?? '', macroValues) : '',
            length: instruct.scenario ? characterCounts.scenarioTokens : 0,
        },
    ]
    const slots: Record<string, string> = {}
    const components: { key: string; tokens: number }[] = []
    macros.forEach((m) => {
        slots[m.macro.slice(2, -2)] = m.value
        const occurrences = systemPrompt.split(m.macro).length - 1
        systemPromptLength += m.length * occurrences
        components.push({ key: m.macro.slice(2, -2), tokens: m.length * occurrences })
    })
    systemPrompt = applyMacros(systemPrompt, { ...macroValues, ...slots })
    return { systemPrompt, systemPromptLength, components }
}

const warnNoMessages = () => {
    Logger.warnToast(t('generation.warn.noMessagesAddedCheckLogs'))
    Logger.warn(
        'No messages were added to the context. This can be caused by:\n- Generated Length is too high, lower it in Formatting\n- Your context length is too low\n- Your first message is too long'
    )
}
