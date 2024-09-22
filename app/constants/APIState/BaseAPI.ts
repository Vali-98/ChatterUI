import { AppSettings, Global } from '@constants/GlobalValues'
import { Llama } from '@constants/LlamaLocal'
import { Tokenizer } from '@constants/Tokenizer'
import { API } from '@globals'
import { Characters } from 'app/constants/Characters'
import { Chats, useInference } from 'app/constants/Chat'
import { InstructType, Instructs } from 'app/constants/Instructs'
import { Logger } from 'app/constants/Logger'
import { mmkv } from 'app/constants/MMKV'
import { replaceMacros } from 'app/constants/Utils'
import EventSource from 'react-native-sse'

import { SamplerID, Samplers, SamplerPreset } from '../SamplerData'

export type APISampler = {
    samplerID: SamplerID
    externalName: string
}

export interface IAPIBase {
    samplers: APISampler[]
    buildPayload: () => any
    getSamplerFields: (max_length?: number) => any
    inference: () => Promise<void>
}

export abstract class APIBase implements IAPIBase {
    samplers: APISampler[] = []
    buildPayload = () => {}
    getSamplerFields = (max_length?: number) => {
        //TODO: Get From Preset and construct
        const data = mmkv.getString(Global.PresetData)
        if (!data) return
        const preset: SamplerPreset = JSON.parse(data)
        return [...this.samplers]
            .map((item: APISampler) => {
                const value = preset[item.samplerID]
                const samplerItem = Samplers[item.samplerID]
                let cleanvalue = value
                if (typeof value === 'number')
                    if (item.samplerID === 'max_length' && max_length) {
                        cleanvalue = Math.min(value, max_length)
                    } else if (samplerItem.values.type === 'integer') cleanvalue = Math.floor(value)
                return { [item.externalName as SamplerID]: cleanvalue }
            })
            .reduce((acc, obj) => Object.assign(acc, obj), {})
    }
    inference = async () => {}

    constructStopSequence = (): string[] => {
        const instruct = Instructs.useInstruct.getState().replacedMacros()
        const sequence: string[] = []
        if (instruct.stop_sequence !== '')
            instruct.stop_sequence.split(',').forEach((item) => item !== '' && sequence.push(item))
        return sequence
    }

    buildTextCompletionContext = (max_length: number) => {
        const delta = performance.now()

        const tokenizer =
            mmkv.getString(Global.APIType) === API.LOCAL
                ? Llama.useLlama.getState().tokenLength
                : Tokenizer.useTokenizer.getState().getTokenCount

        const messages = [...(Chats.useChat.getState().data?.messages ?? [])]

        const currentInstruct = Instructs.useInstruct.getState().replacedMacros()

        const userCard = { ...Characters.useUserCard.getState().card }
        const currentCard = { ...Characters.useCharacterCard.getState().card }
        const userName = userCard.data?.name ?? ''
        const charName = currentCard.data?.name ?? ''

        const characterCache = Characters.useCharacterCard.getState().getCache(userName)
        const userCache = Characters.useUserCard.getState().getCache(charName)
        const instructCache = Instructs.useInstruct.getState().getCache(charName, userName)

        const user_card_data = (userCard?.data?.description ?? '').trim()
        const char_card_data = (currentCard?.data?.description ?? '').trim()
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
        if (char_card_data) {
            payload += char_card_data
            payload_length += characterCache.description_length
        }
        if (user_card_data) {
            payload += user_card_data
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
            const swipe_len = Chats.useChat.getState().getTokenCount(index)
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

            const name_string = `${message.name} :`
            const name_length = currentInstruct.names ? tokenizer(name_string) : 0

            const shard_length =
                swipe_len + instruct_len + name_length + timestamp_length + wrap_length

            // check if within context window
            if (message_acc_length + payload_length + shard_length > max_length) {
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

        const examples = currentCard.data?.mes_example
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
        Logger.log(`Approximate Context Size: ${message_acc_length + payload_length} tokens`)
        Logger.log(`${(performance.now() - delta).toFixed(2)}ms taken to build context`)
        if (mmkv.getBoolean(AppSettings.PrintContext)) Logger.log(payload)

        return payload
    }

    buildChatCompletionContext = (
        max_length: number,
        systemRole = 'system',
        userRole = 'user',
        assistantRole = 'assistant',
        contentName = 'content'
    ) => {
        const tokenizer =
            mmkv.getString(Global.APIType) === API.LOCAL
                ? Llama.useLlama.getState().tokenLength
                : Tokenizer.useTokenizer.getState().getTokenCount

        const messages = [...(Chats.useChat.getState().data?.messages ?? [])]
        const userCard = { ...Characters.useUserCard.getState().card }
        const currentCard = { ...Characters.useCharacterCard.getState().card }
        const currentInstruct = Instructs.useInstruct.getState().replacedMacros()

        const userName = userCard.data?.name ?? ''
        const charName = currentCard.data?.name ?? ''

        const characterCache = Characters.useCharacterCard.getState().getCache(userName)
        const userCache = Characters.useUserCard.getState().getCache(charName)
        const instructCache = Instructs.useInstruct.getState().getCache(charName, userName)

        const buffer = Chats.useChat.getState().buffer

        // Logic here is that if the buffer is empty, this is not a regen, hence can popped
        if (!buffer) messages.pop()
        const initial = `${currentInstruct.system_prompt}
        \n${userCard?.data?.description ?? ''}
        \n${currentCard?.data?.description ?? ''}`

        let total_length =
            instructCache.system_prompt_length +
            characterCache.description_length +
            userCache.description_length
        const payload = [{ role: systemRole, content: replaceMacros(initial) }]
        const messageBuffer = []

        let index = messages.length - 1
        for (const message of messages.reverse()) {
            const swipe_data = message.swipes[message.swipe_id]
            // special case for claude, prefill may be useful!
            const timestamp_string = `[${swipe_data.send_date.toString().split(' ')[0]} ${swipe_data.send_date.toLocaleTimeString()}]\n`
            const timestamp_length = currentInstruct.timestamp ? tokenizer(timestamp_string) : 0

            const name_string = `${message.name} :`
            const name_length = currentInstruct.names ? tokenizer(name_string) : 0

            const len =
                Chats.useChat.getState().getTokenCount(index) +
                total_length +
                name_length +
                timestamp_length
            if (len > max_length) break
            messageBuffer.push({
                role: message.is_user ? userRole : assistantRole,
                content: replaceMacros(message.swipes[message.swipe_id].swipe),
            })
            total_length += len
            index--
        }
        const output = [...payload, ...messageBuffer.reverse()]

        if (mmkv.getBoolean(AppSettings.PrintContext)) Logger.log(JSON.stringify(output))
        return output
    }

    readableStreamResponse = async (
        endpoint: string,
        payload: string,
        jsonreader: (event: any) => string,
        abort_func = () => {},
        header: KeyHeader = {}
    ) => {
        const replace = RegExp(
            this.constructReplaceStrings()
                .map((item) => item.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'))
                .join(`|`),
            'g'
        )

        const es = new EventSource(endpoint, {
            method: 'POST',
            body: payload,
            headers: {
                accept: 'application/json',
                'Content-Type': 'application/json',
                ...header,
            },
            pollingInterval: 0,
            withCredentials:
                header?.['X-API-KEY'] !== undefined || header?.Authorization !== undefined,
        })

        const closeStream = () => {
            Logger.debug('Running close stream')
            this.stopGenerating()
            es.removeAllEventListeners()
            es.close()
        }

        useInference.getState().setAbort(async () => {
            Logger.debug('Running abort')
            closeStream()
            abort_func()
        })

        es.addEventListener('message', (event) => {
            if (event.data === `[DONE]`) {
                es.close()
                return
            }
            const text = jsonreader(event.data) ?? ''
            const output = Chats.useChat.getState().buffer + text
            Chats.useChat.getState().setBuffer(output.replaceAll(replace, ''))
        })

        es.addEventListener('error', (event) => {
            if ('message' in event) {
                Logger.log('Generation Failed. Check Logs', true)
                Logger.log(`An error occured : ${event?.message ?? ''}`)
            }
            closeStream()
        })
        es.addEventListener('close', (event) => {
            closeStream()
            Logger.log('EventSource closed')
        })
    }

    constructReplaceStrings = (): string[] => {
        const currentInstruct: InstructType = Instructs.useInstruct.getState().replacedMacros()
        // default stop strings defined instructs
        const stops: string[] = this.constructStopSequence()
        // additional stop strings based on context configuration
        const output: string[] = []

        if (currentInstruct.names) {
            const userName = Characters.useCharacterCard.getState().card?.data.name ?? ''
            const charName: string = Characters.useCharacterCard.getState()?.card?.data?.name ?? ''
            output.push(`${userName} :`)
            output.push(`${charName} :`)
        }
        return [...stops, ...output]
    }

    getObject = (key: string) => {
        return JSON.parse(mmkv.getString(key) ?? '{}')
    }
    getString = (key: string) => {
        return mmkv.getString(key) ?? ''
    }
    stopGenerating = () => {
        Chats.useChat.getState().stopGenerating()
    }
}

type KeyHeader = {
    [key: string]: string
}
