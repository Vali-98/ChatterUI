import { Global } from '@lib/constants/GlobalValues'
import { Logger } from '@lib/state/Logger'
import { mmkv } from '@lib/storage/MMKV'
import { SamplerID } from '@lib/constants/SamplerData'

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
        { externalName: 'dry_multiplier', samplerID: SamplerID.DRY_MULTIPLIER },
        { externalName: 'dry_base', samplerID: SamplerID.DRY_BASE },
        { externalName: 'dry_allowed_length', samplerID: SamplerID.DRY_ALLOWED_LENGTH },
        { externalName: 'dry_sequence_break', samplerID: SamplerID.DRY_SEQUENCE_BREAK },
        { externalName: 'xtc_threshold', samplerID: SamplerID.XTC_THRESHOLD },
        { externalName: 'xtc_probability', samplerID: SamplerID.XTC_PROBABILITY },
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
                fetch(new URL('/api/extra/abort', endpoint).toString(), { method: 'GET' })
            }
        )
    }
}

const koboldAPI = new KoboldAPI()
export default koboldAPI
