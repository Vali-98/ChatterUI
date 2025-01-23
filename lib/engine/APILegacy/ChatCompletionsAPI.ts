import { SamplerID } from '@lib/constants/SamplerData'
import { Logger } from '@lib/state/Logger'

import { APIBase, APISampler } from './BaseAPI'
import { Global } from '../../constants/GlobalValues'

class ChatCompletionsAPI extends APIBase {
    samplers: APISampler[] = [
        { externalName: 'max_context_length', samplerID: SamplerID.CONTEXT_LENGTH },
        { externalName: 'max_tokens', samplerID: SamplerID.GENERATED_LENGTH },
        { externalName: 'stream', samplerID: SamplerID.STREAMING },
        { externalName: 'temperature', samplerID: SamplerID.TEMPERATURE },
        { externalName: 'top_p', samplerID: SamplerID.TOP_P },
        { externalName: 'presence_penalty', samplerID: SamplerID.PRESENCE_PENALTY },
        { externalName: 'frequency_penalty', samplerID: SamplerID.FREQUENCY_PENALTY },
        { externalName: 'seed', samplerID: SamplerID.SEED },
    ]

    buildPayload = () => {
        const payloadFields = this.getSamplerFields()

        // assumed this field exists
        //@ts-ignore
        const { max_context_length, ...rest } = payloadFields

        // NOTE: This 8192 value is arbitrary, as setting it to 0 results poor responses
        const length = max_context_length ?? 8192

        const messages = this.buildChatCompletionContext(length as number)
        const model = this.getObject(Global.ChatCompletionsModel)
        return {
            ...rest,
            messages: messages,
            model: model.id,
            stop: this.constructStopSequence(),
        }
    }

    inference = async () => {
        const endpoint = this.getString(Global.ChatCompletionsEndpoint)
        const key = this.getString(Global.ChatCompletionsKey)

        Logger.log(`Using endpoint: Chat Completions`)
        this.readableStreamResponse(
            new URL('v1/chat/completions', endpoint).toString(),
            JSON.stringify(this.buildPayload()),
            (item) => {
                const output = JSON.parse(item)
                return (
                    output?.choices?.[0]?.text ??
                    output?.choices?.[0]?.delta?.content ??
                    output?.content ??
                    ''
                )
            },
            () => {},
            { Authorization: `Bearer ${key}` }
        )
    }
}

const chatCompletionsAPI = new ChatCompletionsAPI()
export default chatCompletionsAPI
