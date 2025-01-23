import { Global } from '@lib/constants/GlobalValues'
import { Logger } from '@lib/storage/Logger'
import { SamplerID } from '@lib/constants/SamplerData'

import { APIBase, APISampler } from './BaseAPI'

class OpenAIAPI extends APIBase {
    samplers: APISampler[] = [
        { externalName: 'max_context_length', samplerID: SamplerID.CONTEXT_LENGTH },
        { externalName: 'max_tokens', samplerID: SamplerID.GENERATED_LENGTH },
        { externalName: 'temperature', samplerID: SamplerID.TEMPERATURE },
        { externalName: 'presence_penalty', samplerID: SamplerID.PRESENCE_PENALTY },
        { externalName: 'frequency_penalty', samplerID: SamplerID.FREQUENCY_PENALTY },
        { externalName: 'top_p', samplerID: SamplerID.TOP_P },
        { externalName: 'seed', samplerID: SamplerID.SEED },
    ]
    buildPayload = () => {
        const payloadFields = this.getSamplerFields()

        // assumed this field exists
        //@ts-ignore
        const { max_context_length, ...rest } = payloadFields

        // NOTE: This 8192 value is arbitrary, as setting it to 0 results poor responses
        const length = max_context_length ?? 8192

        const openAIModel = this.getObject(Global.OpenAIModel)

        return {
            ...rest,
            model: openAIModel.id,
            stream: true,
            messages: this.buildChatCompletionContext(length),
            stop: this.constructStopSequence(),
        }
    }
    inference = async () => {
        Logger.log(`Using endpoint: OpenAI`)
        this.readableStreamResponse(
            'https://api.openai.com/v1/chat/completions',
            JSON.stringify(this.buildPayload()),
            (item) => {
                return JSON.parse(item).choices[0]?.delta?.content ?? ''
            },
            () => {},
            { Authorization: `Bearer ${this.getString(Global.OpenAIKey)}` }
        )
    }
}

const openaiAPI = new OpenAIAPI()
export default openaiAPI
