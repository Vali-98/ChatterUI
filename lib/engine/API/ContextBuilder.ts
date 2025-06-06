import { AppSettings } from '@lib/constants/GlobalValues'
import { Tokenizer } from '@lib/engine/Tokenizer'
import { Characters } from '@lib/state/Characters'
import { ChatEntry, Chats } from '@lib/state/Chat'
import { Instructs, InstructType } from '@lib/state/Instructs'
import { Logger } from '@lib/state/Logger'
import { mmkv } from '@lib/storage/MMKV'
import { getDefaultMacroRules, Macro } from '@lib/utils/Macros'

import { APIConfiguration, APIValues } from './APIBuilder.types'
import { readAsStringAsync } from 'expo-file-system'

const getMacrosRules = (instruct: InstructType) => {
    const rules = getDefaultMacroRules()
    if (instruct.hide_think_tags) {
        rules.push({
            macro: /<think>[\s\S]*?<\/think>/g,
            value: '',
        })
    }
    return rules
}

const replaceMacros = (data: string, rules: Macro[]) => {
    for (const rule of rules) data = data.replaceAll(rule.macro, rule.value)
    return data
}

const getCardData = () => {
    const userCard = { ...Characters.useUserCard.getState().card }
    const currentCard = { ...Characters.useCharacterCard.getState().card }
    return { userCard, currentCard }
}

const getCaches = async (charName: string, userName: string) => {
    const characterCache = await Characters.useCharacterCard.getState().getCache(userName)
    const userCache = await Characters.useUserCard.getState().getCache(charName)
    const instructCache = await Instructs.useInstruct.getState().getCache(charName, userName)
    return { characterCache, userCache, instructCache }
}

export const buildTextCompletionContext = async (max_length: number, printTimings = true) => {
    const delta = performance.now()
    const bypassContextLength = mmkv.getBoolean(AppSettings.BypassContextLength)
    const tokenizer = Tokenizer.getTokenizer()
    const messages = [...(Chats.useChatState.getState().data?.messages ?? [])]

    const currentInstruct = Instructs.useInstruct.getState().replacedMacros()

    const { userCard, currentCard } = getCardData()
    const userName = userCard?.name ?? ''
    const charName = currentCard?.name ?? ''
    const userCardData = (userCard?.description ?? '').trim()
    const charCardData = (currentCard?.description ?? '').trim()

    const { characterCache, userCache, instructCache } = await getCaches(charName, userName)
    const rules = getMacrosRules(currentInstruct)
    let payload = ``

    // set suffix length as its always added
    let payload_length = instructCache.system_suffix_length
    if (currentInstruct.system_prefix) {
        payload += currentInstruct.system_prefix
        payload_length += instructCache.system_prefix_length
    }

    if (currentInstruct.system_prompt) {
        payload += `${currentInstruct.system_prompt}`
        payload_length += instructCache.system_prompt_length
    }
    if (charCardData) {
        payload += charCardData
        payload_length += characterCache.description_length
    }

    if (currentInstruct.scenario && currentCard?.scenario) {
        payload += currentCard.scenario
        payload_length += characterCache.scenario_length
    }

    if (currentInstruct.scenario && currentCard?.personality) {
        payload += currentCard.personality
        payload_length += characterCache.personality_length
    }

    if (userCardData) {
        payload += userCardData
        payload_length += userCache.description_length
    }
    // suffix must be delayed for example messages
    let message_acc = ``
    let message_acc_length = 0
    let is_last = true
    let index = messages.length - 1

    const wrap_string = `\n`
    const wrap_length = currentInstruct.wrap ? await tokenizer(wrap_string) : 0

    // we use this to check if the first message is reached
    // this is needed to check if examples should be added
    let first_message_reached = false

    // we require lengths for names if use_names is enabled
    for (const message of messages.reverse()) {
        const swipe_len = await Chats.useChatState.getState().getTokenCount(index)
        const swipe_data = message.swipes[message.swipe_id]

        /** Accumulate total string length
         *  The context builder MUST retain context length below the
         *  context limit, especially for local gens to prevent truncation
         * **/

        let instruct_len = message.is_user
            ? instructCache.input_prefix_length
            : is_last
              ? instructCache.last_output_prefix_length
              : instructCache.output_suffix_length

        // for last message, we want to skip the end token to allow the LLM to generate

        if (!is_last)
            instruct_len += message.is_user
                ? instructCache.input_suffix_length
                : instructCache.output_suffix_length

        const timestamp_string = `[${swipe_data.send_date.toString().split(' ')[0]} ${swipe_data.send_date.toLocaleTimeString()}]\n`
        const timestamp_length = currentInstruct.timestamp ? await tokenizer(timestamp_string) : 0

        const name_string = `${message.name}: `
        const name_length = currentInstruct.names ? await tokenizer(name_string) : 0

        const shard_length = swipe_len + instruct_len + name_length + timestamp_length + wrap_length

        // check if within context window
        if (
            message_acc_length + payload_length + shard_length > max_length &&
            !bypassContextLength
        ) {
            break
        }

        // apply strings

        let message_shard = message.is_user
            ? currentInstruct.input_prefix
            : is_last
              ? currentInstruct.last_output_prefix
              : currentInstruct.output_prefix

        if (currentInstruct.timestamp) message_shard += timestamp_string

        if (currentInstruct.names) message_shard += name_string

        message_shard += swipe_data.swipe

        if (!is_last) {
            message_shard += `${message.is_user ? currentInstruct.input_suffix : currentInstruct.output_suffix}`
        }

        if (currentInstruct.wrap) {
            message_shard += wrap_string
        }

        first_message_reached = index === 0

        // ensure no more is_last checks after this
        is_last = false
        message_acc_length += shard_length
        message_acc = message_shard + message_acc
        index--
    }

    const examples = currentCard?.mes_example
    if (
        first_message_reached &&
        currentInstruct.examples &&
        examples &&
        message_acc_length + payload_length + characterCache.examples_length < max_length
    ) {
        payload += examples
        message_acc_length += characterCache.examples_length
    }

    payload += currentInstruct.system_suffix

    payload = replaceMacros(payload + message_acc, rules)
    if (printTimings) {
        Logger.info(`Approximate Context Size: ${message_acc_length + payload_length} tokens`)
        Logger.info(`${(performance.now() - delta).toFixed(2)}ms taken to build context`)
    }
    if (mmkv.getBoolean(AppSettings.PrintContext)) Logger.info(payload)

    return payload
}

type ContentTypes =
    | { type: 'input_text' | 'text'; text: string }
    | { type: 'image_url'; image_url: { url: string } }
    | { type: 'input_audio'; input_audio: { data: string; format: string } }

type Message = { role: string; [x: string]: ContentTypes[] | string }

export const buildChatCompletionContext = async (
    max_length: number,
    config: APIConfiguration,
    values: APIValues
): Promise<Message[] | void> => {
    const delta = performance.now()
    const bypassContextLength = mmkv.getBoolean(AppSettings.BypassContextLength)
    if (config.request.completionType.type !== 'chatCompletions') return
    const completionFeats = config.request.completionType
    const tokenizer = Tokenizer.getTokenizer()

    const messages = [...(Chats.useChatState.getState().data?.messages ?? [])]
    const currentInstruct = Instructs.useInstruct.getState().replacedMacros()
    const rules = getMacrosRules(currentInstruct)
    const { userCard, currentCard } = getCardData()
    const userName = userCard?.name ?? ''
    const charName = currentCard?.name ?? ''

    const { characterCache, userCache, instructCache } = await getCaches(charName, userName)

    const buffer = Chats.useChatState.getState().buffer

    // Logic here is that if the buffer is empty, this is not a regen, hence can popped
    if (!buffer) messages.pop()
    let initial = `${currentInstruct.system_prompt}
    \n${userCard?.description ?? ''}
    \n${currentCard?.description ?? ''}`

    let total_length =
        instructCache.system_prompt_length +
        characterCache.description_length +
        userCache.description_length

    if (currentInstruct.scenario && currentCard?.scenario) {
        initial += currentCard.scenario
        total_length += characterCache.scenario_length
    }

    if (currentInstruct.scenario && currentCard?.personality) {
        initial += currentCard.personality
        total_length += characterCache.personality_length
    }

    const payload: Message[] = [
        {
            role: completionFeats.systemRole,
            [completionFeats.contentName]: replaceMacros(initial, rules),
        },
    ]
    let hasImage = false
    const messageBuffer: Message[] = []
    let index = messages.length - 1
    for (const message of messages.reverse()) {
        const swipe_data = message.swipes[message.swipe_id]
        // special case for claude, prefill may be useful!
        const timestamp_string = `[${swipe_data.send_date.toString().split(' ')[0]} ${swipe_data.send_date.toLocaleTimeString()}]\n`
        const timestamp_length = currentInstruct.timestamp ? await tokenizer(timestamp_string) : 0

        const name_string = `${message.name} :`
        const name_length = currentInstruct.names ? await tokenizer(name_string) : 0
        const { attachments, hasImageNew } = getValidAttachments(
            message,
            completionFeats,
            currentInstruct,
            hasImage
        )

        const len =
            (await Chats.useChatState.getState().getTokenCount(index, {
                addAttachments: attachments.length > 0,
                lastImageOnly: currentInstruct.last_image_only,
            })) +
            name_length +
            timestamp_length

        if (total_length + len > max_length && !bypassContextLength) break
        hasImage = hasImageNew

        const prefill = index === messages.length - 1 ? values.prefill : ''

        if (!swipe_data.swipe && !prefill && index === messages.length - 1) {
            index--
            continue
        }
        const role = message.is_user ? completionFeats.userRole : completionFeats.assistantRole

        if (message.attachments.length > 0) {
            Logger.warn('Image output is incomplete')

            const images: ContentTypes[] = await Promise.all(
                attachments.map(async (item) => {
                    const base64data = await readAsStringAsync(item.uri, { encoding: 'base64' })
                    if (item.type === 'image')
                        return {
                            type: 'image_url',
                            image_url: {
                                url: 'data:' + item.mime_type + ';base64,' + base64data,
                            },
                        }
                    return {
                        type: 'input_audio',
                        input_audio: {
                            data: base64data,
                            format: item.mime_type.split('/')[1],
                        },
                    }
                })
            )

            messageBuffer.push({
                role: role,
                [completionFeats.contentName]: [
                    {
                        type: 'text',
                        text: replaceMacros(prefill + swipe_data.swipe, rules),
                    },
                    ...images,
                ],
            })
        } else {
            messageBuffer.push({
                role: role,
                [completionFeats.contentName]: replaceMacros(prefill + swipe_data.swipe, rules),
            })
        }

        total_length += len
        index--
    }

    if (config.features.useFirstMessage && values.firstMessage)
        messageBuffer.push({
            role: completionFeats.userRole,
            [completionFeats.contentName]: values.firstMessage,
        })

    const output = [...payload, ...messageBuffer.reverse()]
    Logger.info(`Approximate Context Size: ${total_length} tokens`)
    Logger.info(`${(performance.now() - delta).toFixed(2)}ms taken to build context`)
    if (mmkv.getBoolean(AppSettings.PrintContext)) Logger.info(JSON.stringify(output))

    return output
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
