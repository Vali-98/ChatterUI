import { t } from 'i18next'

import { AppSettings } from '@lib/constants/GlobalValues'
import { useTextFilterStore } from '@lib/hooks/TextFilter'
import { buildThinkRules } from '@lib/markdown/ThinkTags'
import { useAppModeStore } from '@lib/state/AppMode'
import { CharacterCard, CharacterTokenCounts } from '@lib/state/characters'
import { ChatMessage } from '@lib/state/chat'
import { defaultSystemPromptFormat, InstructTokenCache, InstructType } from '@lib/state/Instructs'
import { Logger } from '@lib/state/Logger'
import { getActiveMacros, replaceMacros } from '@lib/state/Macros'
import { mmkv } from '@lib/storage/MMKV'
import { readBase64Async } from '@lib/utils/File'
import { applyMacros } from '@lib/utils/Macros'

import { APIConfiguration, APIValues } from './APIBuilder.types'
import type { DataSource, DataSourceResult } from '../DataSources/types'

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
    | 'initial_truncated'
    | 'initial_completed'
    | 'loader_completed'
    | 'loader_truncated'

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
        instruct,
        user,
        character,
        userCounts,
        characterCounts,
        instructCache,
        usePrefix,
        useSuffix,
    })

    const reservedBudget = sortedDataSources.reduce((acc, curr) => acc + curr.tokenBudget, 0)

    let totalLength = systemPromptLength + reservedBudget

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
        const swipeLen = await chatTokenizer(message, index)

        const timestamp = instruct.timestamp
            ? `[${swipe.send_date.toDateString()} ${swipe.send_date.toLocaleTimeString()}]\n`
            : ''

        const name = instruct.names ? `${message.name}: ` : ''

        const timestampLen = instruct.timestamp ? await tokenizer(timestamp) : 0
        const nameLen = instruct.names ? await tokenizer(name) : 0

        let instructLen = 0
        if (mode === 'text') {
            instructLen += message.is_user
                ? instructCache.input_prefix_length
                : instructCache.output_prefix_length
        }

        const shardLen = swipeLen + timestampLen + nameLen + instructLen

        // HARD LIMIT (always enforced)
        if (totalLength + shardLen > maxLength && !bypassContextLength) {
            return false
        }

        if (!swipe.swipe && isLast) {
            return true
        }

        const role: 'user' | 'assistant' = message.is_user ? 'user' : 'assistant'

        const content = filterContextText(
            replaceMacros(`${timestamp}${name}${swipe.swipe}`),
            instruct
        )

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
                                format: item.mime_type.split('/')[1],
                            },
                        }
                    })
                )
            }
        }

        contextMessages.push({ role, content, attachments })

        totalLength += shardLen

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
                contextMessages,
                maxLength,
                totalLength,
                budget,
                lastMessageReached
            )
            for (const result of results) {
                pendingInsertions.push(result)
                totalLength += result.tokenLength

                Logger.info(
                    `[DataSource:${source.name}] inserted ${result.tokenLength} tokens from ${result.source}`
                )
            }
        }
    }

    await runDataSources(sortedDataSources)

    const insertMessage = (index: number, message: ContextMessage) => {
        contextMessages.splice(index, 0, message)
    }

    for (const insertion of pendingInsertions) {
        const syntheticMessage: ContextMessage = {
            role: 'user',
            content: filterContextText(insertion.content, instruct),
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

        if (index >= contextMessages.length) {
            contextMessages.unshift(syntheticMessage)
        } else {
            insertMessage(index, syntheticMessage)
        }
    }

    Logger.info(`Approximate Context Size: ${totalLength}`)
    Logger.info(`${(performance.now() - delta).toFixed(2)}ms`)

    if (contextMessages.length === 0) warnNoMessages()
    return {
        systemPrompt: systemPrompt,
        messages: contextMessages.reverse(),
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
            [feats.contentName]: filterContextText(systemPrompt, params.instruct),
        },
    ]

    for (const msg of messages) {
        if (msg.attachments?.length) {
            payload.push({
                role: msg.role,
                [feats.contentName]: [{ type: 'text', text: msg.content }, ...msg.attachments],
            })
        } else {
            payload.push({
                role: msg.role,
                [feats.contentName]: msg.content,
            })
        }
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
    const result = filterContextText(output, instruct)
    printContext(result)
    return result
}

const thinkRule = buildThinkRules()

const filterContextText = (text: string, instruct: InstructType) => {
    let result = text
    const { sendFilteredText, filter } = useTextFilterStore.getState()
    if (!sendFilteredText) {
        for (const pattern of filter) result = result.replace(new RegExp(pattern, 'gi'), '')
    }
    if (instruct.hide_think_tags) {
        for (const rule of thinkRule) result = result.replace(rule.macro, () => rule.value)
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
}: {
    instruct: InstructType
    user?: CharacterCard
    character?: CharacterCard
    userCounts: CharacterTokenCounts
    characterCounts: CharacterTokenCounts
    instructCache: InstructTokenCache
    usePrefix?: boolean
    useSuffix?: boolean
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
            length: instructCache.system_prefix_length,
        },
        {
            macro: '{{system_suffix}}',
            value: (useSuffix && instruct.system_suffix) || '',
            length: instructCache.system_suffix_length,
        },
        {
            macro: '{{system_prompt}}',
            value: instruct.system_prompt ?? '',
            length: instructCache.system_suffix_length,
        },
        {
            macro: '{{character_desc}}',
            value: replaceMacros(character?.description ?? ''),
            length: characterCounts.descriptionTokens,
        },
        {
            macro: '{{user_desc}}',
            value: replaceMacros(user?.description ?? ''),
            length: userCounts.descriptionTokens,
        },
        {
            macro: '{{personality}}',
            value: instruct.personality ? replaceMacros(character?.personality ?? '') : '',
            length: instruct.personality ? characterCounts.personalityTokens : 0,
        },
        {
            macro: '{{scenario}}',
            value: instruct.scenario ? replaceMacros(character?.scenario ?? '') : '',
            length: instruct.scenario ? characterCounts.scenarioTokens : 0,
        },
    ]
    const slots: Record<string, string> = {}
    macros.forEach((m) => {
        slots[m.macro.slice(2, -2)] = m.value
        systemPromptLength += m.length
    })
    systemPrompt = applyMacros(systemPrompt, { ...getActiveMacros(), ...slots })
    return { systemPrompt, systemPromptLength }
}

const warnNoMessages = () => {
    Logger.warnToast(t('generation.warn.noMessagesAddedCheckLogs'))
    Logger.warn(
        'No messages were added to the context. This can be caused by:\n- Generated Length is too high, lower it in Formatting\n- Your context length is too low\n- Your first message is too long'
    )
}
