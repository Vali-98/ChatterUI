import { AppSettings } from '@lib/constants/GlobalValues'
import { buildThinkRules } from '@lib/markdown/ThinkTags'
import { CharacterCardData, CharacterTokenCache } from '@lib/state/Characters'
import { ChatEntry } from '@lib/state/Chat'
import { defaultSystemPromptFormat, InstructTokenCache, InstructType } from '@lib/state/Instructs'
import { Logger } from '@lib/state/Logger'
import { replaceMacros } from '@lib/state/Macros'
import { mmkv } from '@lib/storage/MMKV'
import { readBase64Async } from '@lib/utils/File'
import { Macro } from '@lib/utils/Macros'

import { APIConfiguration, APIValues } from './APIBuilder.types'

export type MessageLoader = {
    retrieve: (page: number) => Promise<ChatEntry[]> // must retrieve messages in chronological order from oldest to newest
    pageSize: number // we use this to determine if a last page has been reached, if the
    initialPage: number // usually 0
}

export type TokenCache = {
    userCache: CharacterTokenCache
    characterCache: CharacterTokenCache
    instructCache: InstructTokenCache
}

const printContext = (context: string) => {
    if (!mmkv.getBoolean(AppSettings.PrintContext)) return
    Logger.info(JSON.stringify(context))
}

export interface ContextBuilderParams {
    apiConfig: APIConfiguration
    apiValues: APIValues
    messages: ChatEntry[]
    character: CharacterCardData
    instruct: InstructType
    user: CharacterCardData
    tokenizer: (data: string, media_paths?: string[]) => Promise<number> | number
    chatTokenizer: (entry: ChatEntry, index: number) => Promise<number>
    maxLength: number
    cache: TokenCache
    bypassContextLength?: boolean
    messageLoader?: MessageLoader
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
    printContext((typeof output === 'object' ? JSON.stringify(output) : output) ?? 'No Output')
    return output
}

type ContextMessage = {
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
    } = params

    const delta = performance.now()

    const { characterCache, userCache, instructCache } = cache

    const usePrefix = mode === 'text'
    const useSuffix = false

    let { systemPrompt, systemPromptLength } = getSystemPrompt({
        instruct,
        user,
        character,
        userCache,
        characterCache,
        instructCache,
        usePrefix,
        useSuffix,
    })

    let totalLength = systemPromptLength
    let hasImage = false
    let completionState: CompletionState = 'initial_completed'

    const contextMessages: ContextMessage[] = []

    /**
     * Shared processor
     */
    const processMessage = async (
        message: ChatEntry,
        index: number,
        isLast: boolean
    ): Promise<boolean> => {
        const swipe = message.swipes[message.swipe_id]
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

        const content = replaceMacrosInternal(`${timestamp}${name}${swipe.swipe}`, instruct)

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
            let batch: ChatEntry[] | null = null

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

    const examples = character?.mes_example

    const addExamples =
        completionState === 'loader_completed' ||
        (completionState === 'initial_completed' &&
            instruct.examples &&
            examples &&
            totalLength + characterCache.examples_length < maxLength)

    if (addExamples) {
        systemPrompt += '\n' + examples
        totalLength += characterCache.examples_length
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
            [feats.contentName]: replaceMacrosInternal(systemPrompt, params.instruct),
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

    return payload
}

export const buildTextCompletionContext = async (params: ContextBuilderParams) => {
    const { systemPrompt, messages } = await collectContext({
        ...params,
        mode: 'text',
    })

    const { instruct } = params

    let output = systemPrompt + instruct.system_suffix

    for (const msg of messages) {
        let shard = msg.role === 'user' ? instruct.input_prefix : instruct.output_prefix

        shard += msg.content

        shard += msg.role === 'user' ? instruct.input_suffix : instruct.output_suffix

        if (instruct.wrap) shard += '\n'

        output += shard
    }

    output += instruct.last_output_prefix

    return replaceMacrosInternal(output, instruct)
}

const thinkRule = buildThinkRules()

const getMacroRules = (instruct: InstructType) => {
    const data: Macro[] = []
    if (instruct.hide_think_tags) {
        data.concat(thinkRule)
    }
    // for expansion
    return data
}

const replaceMacrosInternal = (data: string, instruct: InstructType) => {
    return replaceMacros(data, { extraMacros: getMacroRules(instruct) })
}

const getValidAttachments = (
    entry: ChatEntry,
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
    userCache,
    characterCache,
    instructCache,
    usePrefix = true,
    useSuffix = true,
}: {
    instruct: InstructType
    user?: CharacterCardData
    character?: CharacterCardData
    userCache: CharacterTokenCache
    characterCache: CharacterTokenCache
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
            value: character?.description ?? '',
            length: characterCache.description_length,
        },
        {
            macro: '{{user_desc}}',
            value: user?.description ?? '',
            length: userCache.description_length,
        },
        {
            macro: '{{personality}}',
            value: instruct.personality ? (character?.personality ?? '') : '',
            length: instruct.personality ? characterCache.personality_length : 0,
        },
        {
            macro: '{{scenario}}',
            value: instruct.scenario ? (character?.scenario ?? '') : '',
            length: instruct.scenario ? characterCache.scenario_length : 0,
        },
    ]
    macros.forEach((m) => {
        systemPrompt = systemPrompt.replaceAll(m.macro, m.value)
        systemPromptLength += m.length
    })
    return { systemPrompt, systemPromptLength }
}

const warnNoMessages = () => {
    Logger.warnToast('No messages added. Check Logs.')
    Logger.warn(
        'No messages were added to the context. This can be caused by:\n- Generated Length is too high, lower it in Formatting\n- Your context length is too low\n- Your first message is too long'
    )
}
