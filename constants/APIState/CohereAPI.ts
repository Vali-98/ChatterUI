import { CohereModel } from '@components/Endpoint/Cohere'
import { Global } from 'constants/GlobalValues'
import { Logger } from 'constants/Logger'
import { SamplerID } from 'constants/SamplerData'

import { APIBase, APISampler } from './BaseAPI'

class CohereAPI extends APIBase {
    samplers: APISampler[] = [
        { externalName: 'max_context_length', samplerID: SamplerID.CONTEXT_LENGTH },
        { externalName: 'max_tokens', samplerID: SamplerID.GENERATED_LENGTH },
        { externalName: 'stream', samplerID: SamplerID.STREAMING },
        { externalName: 'temperature', samplerID: SamplerID.TEMPERATURE },
        { externalName: 'p', samplerID: SamplerID.TOP_P },
        { externalName: 'k', samplerID: SamplerID.TOP_K },
        { externalName: 'presence_penalty', samplerID: SamplerID.PRESENCE_PENALTY },
        { externalName: 'frequency_penalty', samplerID: SamplerID.FREQUENCY_PENALTY },
        { externalName: 'seed', samplerID: SamplerID.SEED },
    ]
    buildPayload = () => {
        const payloadFields = this.getSamplerFields()
        const length =
            typeof payloadFields?.['max_context_length'] === 'number'
                ? payloadFields?.['max_context_length']
                : 0

        const cohereModel: CohereModel = this.getObject(Global.CohereModel)

        const [preamble, ...chat_history] = this.buildChatCompletionContext(
            Math.min(length, cohereModel.context_length),
            'SYSTEM',
            'USER',
            'CHATBOT'
        ).map((item) => ({ role: item.role, message: item.content }))
        const last = chat_history.pop()

        if (payloadFields?.['seed'] === -1) delete payloadFields?.['seed']

        const payload = {
            message: last?.message ?? '',
            ...payloadFields,
            model: cohereModel.name,
            preamble: preamble.message,
            chat_history: chat_history,
            stop: this.constructStopSequence(),
            stream: true,
        }
        return payload
    }
    inference = async () => {
        Logger.log(`Using endpoint: Cohere`)
        this.readableStreamResponse(
            'https://api.cohere.com/v1/chat',
            JSON.stringify(this.buildPayload()),
            (item) => {
                return JSON.parse(item).text
            },
            () => {},
            { Authorization: `Bearer ${this.getString(Global.CohereKey)}` }
        )
    }
}

const cohereAPI = new CohereAPI()
export default cohereAPI
