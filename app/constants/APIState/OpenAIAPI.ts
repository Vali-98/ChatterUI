import { Global } from '@constants/GlobalValues'
import { Logger } from 'app/constants/Logger'
import { SamplerID } from 'app/constants/Samplers'

import { APIBase, APISampler } from './BaseAPI'

class OpenAIAPI extends APIBase {
    samplers: APISampler[] = [
        { externalName: 'max_tokens', samplerID: SamplerID.GENERATED_LENGTH },
        { externalName: 'temperature', samplerID: SamplerID.TEMPERATURE },
        { externalName: 'presence_penalty', samplerID: SamplerID.PRESENCE_PENALTY },
        { externalName: 'frequency_penalty', samplerID: SamplerID.FREQUENCY_PENALTY },
        { externalName: 'top_p', samplerID: SamplerID.TOP_P },
        { externalName: 'seed', samplerID: SamplerID.SEED },
    ]
    buildPayload = () => {
        const payloadFields = this.getSamplerFields()
        const length =
            typeof payloadFields?.['max_context_length'] === 'number'
                ? payloadFields?.['max_context_length']
                : 0
        const openAIModel = this.getObject(Global.OpenAIModel)
        return {
            ...payloadFields,
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
