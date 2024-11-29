import { Global } from 'constants/GlobalValues'
import { SamplerID } from 'constants/SamplerData'

import { APIBase, APISampler } from './BaseAPI'

class TWGUIAPI extends APIBase {
    samplers: APISampler[] = [
        { externalName: 'max_context_length', samplerID: SamplerID.CONTEXT_LENGTH },
        { externalName: 'max_tokens', samplerID: SamplerID.GENERATED_LENGTH },
        { externalName: 'stream', samplerID: SamplerID.STREAMING },
        { externalName: 'repetition_penalty', samplerID: SamplerID.REPETITION_PENALTY },
        { externalName: 'repetition_penalty_range', samplerID: SamplerID.REPETITION_PENALTY_RANGE },
        { externalName: 'temperature', samplerID: SamplerID.TEMPERATURE },
        { externalName: 'tfs', samplerID: SamplerID.TAIL_FREE_SAMPLING },
        { externalName: 'top_a', samplerID: SamplerID.TOP_A },
        { externalName: 'top_p', samplerID: SamplerID.TOP_P },
        { externalName: 'top_k', samplerID: SamplerID.TOP_K },
        { externalName: 'typical_p', samplerID: SamplerID.TYPICAL },
        { externalName: 'min_p', samplerID: SamplerID.MIN_P },
        { externalName: 'smoothing_factor', samplerID: SamplerID.SMOOTHING_FACTOR },
        { externalName: 'seed', samplerID: SamplerID.SEED },
        { externalName: 'dynatemp_base', samplerID: SamplerID.DYNATEMP_RANGE },

        { externalName: 'mirostat', samplerID: SamplerID.MIROSTAT_MODE },
        { externalName: 'mirostat_tau', samplerID: SamplerID.MIROSTAT_TAU },
        { externalName: 'mirostat_eta', samplerID: SamplerID.MIROSTAT_ETA },

        { externalName: 'epsilon_cutoff', samplerID: SamplerID.EPSILON_CUTOFF },
        { externalName: 'eta_cutoff', samplerID: SamplerID.ETA_CUTOFF },
        { externalName: 'min_length', samplerID: SamplerID.MIN_LENGTH },
        { externalName: 'no_repeat_ngram_size', samplerID: SamplerID.NO_REPEAT_NGRAM_SIZE },

        { externalName: 'guidance_scale', samplerID: SamplerID.GUIDANCE_SCALE },
        //TODO: Truncation Length?
        //{ externalName: 'truncation_length', samplerID: SamplerID.TRUNCATION_LENGTH },

        { externalName: 'use_default_badwordids', samplerID: SamplerID.BAN_EOS_TOKEN },
        { externalName: 'add_bos_token', samplerID: SamplerID.ADD_BOS_TOKEN },
        { externalName: 'skip_special_tokens', samplerID: SamplerID.SKIP_SPECIAL_TOKENS },
        { externalName: 'do_sample', samplerID: SamplerID.DO_SAMPLE },

        { externalName: 'grammar', samplerID: SamplerID.GRAMMAR_STRING },
        { externalName: 'negative_prompt', samplerID: SamplerID.NEGATIVE_PROMPT },

        { externalName: 'num_beams', samplerID: SamplerID.NUM_BEAMS },
        { externalName: 'penalty_alpha', samplerID: SamplerID.PENALTY_ALPHA },
        { externalName: 'length_penalty', samplerID: SamplerID.LENGTH_PENALTY },
        { externalName: 'early_stopping', samplerID: SamplerID.EARLY_STOPPING },
    ]
    buildPayload = () => {
        const payloadFields = this.getSamplerFields()
        const length = payloadFields?.['max_context_length']
        const min_p = payloadFields?.['min_p']
        const dynatemp_range = payloadFields?.['dynatemp_range']
        const temp = payloadFields?.['temp']
        let dynatemp_data = {}
        if (typeof temp === 'number' && typeof dynatemp_range === 'number') {
            dynatemp_data = {
                dynamic_temperature: typeof dynatemp_range === 'number' && dynatemp_range > 0,
                dynatemp_low: temp - dynatemp_range / 2,
                dynatemp_high: temp + dynatemp_range / 2,
                dynatemp_exponent: 0.5,
            }
        }

        return {
            ...payloadFields,
            ...dynatemp_data,
            prompt: this.buildTextCompletionContext(typeof length === 'number' ? length : 0),
            temperature_last: min_p !== 1,
            stop_sequence: this.constructStopSequence(),
        }
    }
    inference = async () => {
        const endpoint = this.getString(Global.TGWUIStreamingEndpoint)
        this.readableStreamResponse(
            new URL('/v1/completions', endpoint).toString(),
            JSON.stringify(this.buildPayload()),
            (item) => {
                return JSON.parse(item).choices[0].text
            }
        )
    }
}

const tgwuiAPI = new TWGUIAPI()
export default tgwuiAPI
