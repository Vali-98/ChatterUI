import { Global } from '@constants/GlobalValues'
import { Logger } from 'app/constants/Logger'
import { SamplerID } from 'app/constants/Samplers'

import { APIBase, APISampler } from './BaseAPI'

class OpenRouterAPI extends APIBase {
    samplers: APISampler[] = [
        { externalName: 'max_context_length', samplerID: SamplerID.CONTEXT_LENGTH },
        { externalName: 'max_tokens', samplerID: SamplerID.GENERATED_LENGTH },
        { externalName: 'stream', samplerID: SamplerID.REPETITION_PENALTY },
        { externalName: 'temperature', samplerID: SamplerID.TEMPERATURE },
        { externalName: 'presence_penalty', samplerID: SamplerID.PRESENCE_PENALTY },
        { externalName: 'frequency_penalty', samplerID: SamplerID.FREQUENCY_PENALTY },
        { externalName: 'top_p', samplerID: SamplerID.TOP_P },
        { externalName: 'top_k', samplerID: SamplerID.TOP_K },
        { externalName: 'seed', samplerID: SamplerID.SEED },
    ]
    buildPayload = () => {
        const payloadFields = this.getSamplerFields()
        const length =
            typeof payloadFields?.['max_context_length'] === 'number'
                ? payloadFields?.['max_context_length']
                : 0
        const openRouterModel = this.getObject(Global.OpenRouterModel)
        return {
            ...payloadFields,
            model: openRouterModel.id,
            stream: true,
            messages: this.buildChatCompletionContext(
                Math.min(length, openRouterModel.context_length)
            ),
            stop: this.constructStopSequence(),
            response_format: { type: 'json_object' },
        }
    }
    inference = async () => {
        Logger.log(`Using endpoint: OpenRouter`)
        this.readableStreamResponse(
            'https://openrouter.ai/api/v1/chat/completions',
            JSON.stringify(this.buildPayload()),
            (item) => {
                return JSON.parse(item).choices[0]?.delta?.content ?? ''
            },
            () => {},
            { Authorization: `Bearer ${this.getString(Global.OpenRouterKey)}` }
        )
    }
}

const openRouterAPI = new OpenRouterAPI()
export default openRouterAPI
