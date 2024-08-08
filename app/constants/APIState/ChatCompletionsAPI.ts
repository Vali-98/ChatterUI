import { Logger } from '@constants/Logger'
import { SamplerID } from '@constants/SamplerData'

import { APIBase, APISampler } from './BaseAPI'
import { Global } from '../GlobalValues'

class ChatCompletionsAPI extends APIBase {
    samplers: APISampler[] = [
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
        const max_length = (payloadFields?.['max_tokens'] ?? 0) as number
        const messages = this.buildChatCompletionContext(max_length)
        const model = this.getObject(Global.ChatCompletionsModel)

        return {
            ...payloadFields,
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
                console.log(item)
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
