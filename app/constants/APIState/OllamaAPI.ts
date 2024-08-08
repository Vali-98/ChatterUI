import { Global } from '@constants/GlobalValues'
import { Logger } from 'app/constants/Logger'
import { SamplerID } from 'app/constants/SamplerData'

import { APIBase, APISampler } from './BaseAPI'

class OllamaAPI extends APIBase {
    samplers: APISampler[] = [
        { externalName: 'num_ctx', samplerID: SamplerID.CONTEXT_LENGTH },
        { externalName: 'num_predict', samplerID: SamplerID.GENERATED_LENGTH },
        //{ externalName: 'stream', samplerID: SamplerID.STREAMING },
        { externalName: 'repeat_penalty', samplerID: SamplerID.REPETITION_PENALTY },
        { externalName: 'rep_pen_range', samplerID: SamplerID.REPETITION_PENALTY_RANGE },
        { externalName: 'temperature', samplerID: SamplerID.TEMPERATURE },
        { externalName: 'tfs_z', samplerID: SamplerID.TAIL_FREE_SAMPLING },
        { externalName: 'top_p', samplerID: SamplerID.TOP_P },
        { externalName: 'top_k', samplerID: SamplerID.TOP_K },
        { externalName: 'typical_p', samplerID: SamplerID.TYPICAL },
        { externalName: 'mirostat', samplerID: SamplerID.MIROSTAT_MODE },
        { externalName: 'mirostat_tau', samplerID: SamplerID.MIROSTAT_TAU },
        { externalName: 'mirostat_eta', samplerID: SamplerID.MIROSTAT_ETA },
        { externalName: 'presence_penalty', samplerID: SamplerID.PRESENCE_PENALTY },
        { externalName: 'frequency_penalty', samplerID: SamplerID.FREQUENCY_PENALTY },
        { externalName: 'seed', samplerID: SamplerID.SEED },
    ]
    buildPayload = () => {
        const payloadFields = this.getSamplerFields()
        const length = payloadFields?.['num_ctx']
        //const stream = payloadFields?.['stream']
        const modelname = this.getObject(Global.OllamaModel).name
        return {
            model: modelname,
            options: {
                ...payloadFields,
                stop: this.constructStopSequence(),
            },
            stream: true,
            prompt: this.buildTextCompletionContext(typeof length === 'number' ? length : 0),
            raw: true,
        }
    }
    inference = async () => {
        const endpoint = this.getString(Global.OllamaEndpoint)
        Logger.log(`Using endpoint: Ollama`)
        const payload = this.buildPayload()
        this.readableStreamResponse(
            new URL('/api/generate', endpoint).toString(),
            JSON.stringify(payload),
            (item) => {
                return JSON.parse(item).response
            },
            () => {}
        )
    }
}

const ollamaAPI = new OllamaAPI()
export default ollamaAPI
