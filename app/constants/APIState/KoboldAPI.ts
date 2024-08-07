import { Global } from '@constants/GlobalValues'
import { Logger } from 'app/constants/Logger'
import { SamplerID } from 'app/constants/Samplers'
import { mmkv } from 'app/constants/MMKV'
import axios from 'axios'

import { APIBase, APISampler } from './BaseAPI'

class KoboldAPI extends APIBase {
    samplers: APISampler[] = [
        { externalName: 'max_context_length', samplerID: SamplerID.CONTEXT_LENGTH },
        { externalName: 'max_length', samplerID: SamplerID.GENERATED_LENGTH },
        { externalName: 'rep_pen', samplerID: SamplerID.REPETITION_PENALTY },
        { externalName: 'rep_pen_range', samplerID: SamplerID.REPETITION_PENALTY_RANGE },
        { externalName: 'temperature', samplerID: SamplerID.TEMPERATURE },
        { externalName: 'tfs', samplerID: SamplerID.TAIL_FREE_SAMPLING },
        { externalName: 'top_a', samplerID: SamplerID.TOP_A },
        { externalName: 'top_p', samplerID: SamplerID.TOP_P },
        { externalName: 'top_k', samplerID: SamplerID.TOP_K },
        { externalName: 'typical', samplerID: SamplerID.TYPICAL },
        { externalName: 'mirostat', samplerID: SamplerID.MIROSTAT_MODE },
        { externalName: 'mirostat_tau', samplerID: SamplerID.MIROSTAT_TAU },
        { externalName: 'mirostat_eta', samplerID: SamplerID.MIROSTAT_ETA },
        { externalName: 'min_p', samplerID: SamplerID.MIN_P },
        { externalName: 'grammar', samplerID: SamplerID.GRAMMAR_STRING },
        { externalName: 'use_default_badwordids', samplerID: SamplerID.BAN_EOS_TOKEN },
        { externalName: 'dynatemp_range', samplerID: SamplerID.DYNATEMP_RANGE },
        { externalName: 'smooth_range', samplerID: SamplerID.SMOOTHING_FACTOR },
        { externalName: 'sampler_seed', samplerID: SamplerID.SEED },
    ]
    buildPayload = () => {
        const payloadFields = this.getSamplerFields()
        const length = payloadFields?.['max_context_length']

        return {
            ...payloadFields,
            samplerOrder: [6, 0, 1, 3, 4, 2, 5],
            prompt: this.buildTextCompletionContext(typeof length === 'number' ? length : 0),
            stop_sequence: this.constructStopSequence(),
        }
    }
    inference = async () => {
        const endpoint = mmkv.getString(Global.KAIEndpoint)
        Logger.log(`Using endpoint: KAI`)

        this.readableStreamResponse(
            new URL('/api/extra/generate/stream', endpoint).toString(),
            JSON.stringify(this.buildPayload()),
            (item) => {
                return JSON.parse(item).token
            },
            () => {
                axios
                    .create({ timeout: 1000 })
                    .post(new URL('/api/extra/abort', endpoint).toString())
                    .catch(() => {
                        Logger.log(`Abort signal failed`)
                    })
            }
        )
    }
}

const koboldAPI = new KoboldAPI()
export default koboldAPI
