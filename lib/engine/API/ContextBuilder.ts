import { AppSettings } from '@lib/constants/GlobalValues'
import { Tokenizer } from '@lib/engine/Tokenizer'
import { Characters } from '@lib/state/Characters'
import { Chats } from '@lib/state/Chat'
import { Instructs } from '@lib/state/Instructs'
import { Logger } from '@lib/state/Logger'
import { mmkv } from '@lib/storage/MMKV'
import { replaceMacros } from '@lib/utils/Macros'

import { APIConfiguration, APIValues } from './APIBuilder.types'

const getCardData = () => {
    const userCard = { ...Characters.useUserCard.getState().card }
    const currentCard = { ...Characters.useCharacterCard.getState().card }
    return { userCard, currentCard }
}

const getCaches = (charName: string, userName: string) => {
    const characterCache = Characters.useCharacterCard.getState().getCache(userName)
    const userCache = Characters.useUserCard.getState().getCache(charName)
    const instructCache = Instructs.useInstruct.getState().getCache(charName, userName)
    return { characterCache, userCache, instructCache }
}

export const buildTextCompletionContext = (max_length: number, printTimings = true) => {
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

    const { characterCache, userCache, instructCache } = getCaches(charName, userName)

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
    const wrap_length = currentInstruct.wrap ? tokenizer(wrap_string) : 0

    // we use this to check if the first message is reached
    // this is needed to check if examples should be added
    let first_message_reached = false

    // we require lengths for names if use_names is enabled
    for (const message of messages.reverse()) {
        const swipe_len = Chats.useChatState.getState().getTokenCount(index)
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
        const timestamp_length = currentInstruct.timestamp ? tokenizer(timestamp_string) : 0

        const name_string = `${message.name}: `
        const name_length = currentInstruct.names ? tokenizer(name_string) : 0

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

    payload = replaceMacros(payload + message_acc)
    if (printTimings) {
        Logger.info(`Approximate Context Size: ${message_acc_length + payload_length} tokens`)
        Logger.info(`${(performance.now() - delta).toFixed(2)}ms taken to build context`)
    }
    if (mmkv.getBoolean(AppSettings.PrintContext)) Logger.info(payload)

    return payload
}

type Message = { role: string; [x: string]: string }

export const buildChatCompletionContext = (
    max_length: number,
    config: APIConfiguration,
    values: APIValues
): Message[] | undefined => {
    const delta = performance.now()
    const bypassContextLength = mmkv.getBoolean(AppSettings.BypassContextLength)
    if (config.request.completionType.type !== 'chatCompletions') return
    const completionFeats = config.request.completionType
    const tokenizer = Tokenizer.getTokenizer()

    const messages = [...(Chats.useChatState.getState().data?.messages ?? [])]
    const currentInstruct = Instructs.useInstruct.getState().replacedMacros()

    const { userCard, currentCard } = getCardData()
    const userName = userCard?.name ?? ''
    const charName = currentCard?.name ?? ''

    const { characterCache, userCache, instructCache } = getCaches(charName, userName)

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
        { role: completionFeats.systemRole, [completionFeats.contentName]: replaceMacros(initial) },
    ]

    const messageBuffer: Message[] = []

    let index = messages.length - 1
    for (const message of messages.reverse()) {
        const swipe_data = message.swipes[message.swipe_id]
        // special case for claude, prefill may be useful!
        const timestamp_string = `[${swipe_data.send_date.toString().split(' ')[0]} ${swipe_data.send_date.toLocaleTimeString()}]\n`
        const timestamp_length = currentInstruct.timestamp ? tokenizer(timestamp_string) : 0

        const name_string = `${message.name} :`
        const name_length = currentInstruct.names ? tokenizer(name_string) : 0
        const len =
            Chats.useChatState.getState().getTokenCount(index) + name_length + timestamp_length
        if (total_length + len > max_length && !bypassContextLength) break

        const prefill = index === messages.length - 1 ? values.prefill : ''

        if (!swipe_data.swipe && !prefill && index === messages.length - 1) {
            index--
            continue
        }

        messageBuffer.push({
            role: message.is_user ? completionFeats.userRole : completionFeats.assistantRole,
            content: replaceMacros(prefill + swipe_data.swipe),
        })
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
