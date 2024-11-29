import { OpenAIModel } from '@components/Endpoint/OpenAI'
import { Global } from 'constants/GlobalValues'
import { Logger } from 'constants/Logger'
import { SamplerID } from 'constants/SamplerData'

import { APIBase, APISampler } from './BaseAPI'

class TextCompletionAPI extends APIBase {
    samplers: APISampler[] = [
        { externalName: 'max_context_length', samplerID: SamplerID.CONTEXT_LENGTH },
        { externalName: 'max_tokens', samplerID: SamplerID.GENERATED_LENGTH },
        { externalName: 'stream', samplerID: SamplerID.STREAMING },
        { externalName: 'rep_pen', samplerID: SamplerID.REPETITION_PENALTY },
        { externalName: 'temperature', samplerID: SamplerID.TEMPERATURE },
        { externalName: 'min_p', samplerID: SamplerID.MIN_P },
        { externalName: 'top_a', samplerID: SamplerID.TOP_A },
        { externalName: 'top_p', samplerID: SamplerID.TOP_P },
        { externalName: 'top_k', samplerID: SamplerID.TOP_K },
        { externalName: 'smoothing_factor', samplerID: SamplerID.SMOOTHING_FACTOR },

        { externalName: 'tfs', samplerID: SamplerID.TAIL_FREE_SAMPLING },
        { externalName: 'seed', samplerID: SamplerID.SEED },
        { externalName: 'typical', samplerID: SamplerID.TYPICAL },
        { externalName: 'repetition_penalty', samplerID: SamplerID.REPETITION_PENALTY },
        { externalName: 'rep_pen_range', samplerID: SamplerID.REPETITION_PENALTY_RANGE },

        { externalName: 'sampler_seed', samplerID: SamplerID.SEED },

        { externalName: 'mirostat', samplerID: SamplerID.MIROSTAT_MODE },
        { externalName: 'mirostat_tau', samplerID: SamplerID.MIROSTAT_TAU },
        { externalName: 'mirostat_eta', samplerID: SamplerID.MIROSTAT_ETA },
        { externalName: 'grammar', samplerID: SamplerID.GRAMMAR_STRING },
        { externalName: 'ignore_eos', samplerID: SamplerID.BAN_EOS_TOKEN },
        { externalName: 'dynatemp_range', samplerID: SamplerID.DYNATEMP_RANGE },

        { externalName: 'frequency_penalty', samplerID: SamplerID.FREQUENCY_PENALTY },
        { externalName: 'presence_penalty', samplerID: SamplerID.PRESENCE_PENALTY },
        { externalName: 'skip_special_tokens', samplerID: SamplerID.SKIP_SPECIAL_TOKENS },
    ]
    buildPayload = () => {
        const payloadFields = this.getSamplerFields()
        const length = payloadFields?.['max_context_length']
        const model = this.getObject(Global.CompletionsModel) as OpenAIModel

        return {
            ...payloadFields,
            model: model.id,
            samplerOrder: [6, 0, 1, 3, 4, 2, 5],
            prompt: this.buildTextCompletionContext(typeof length === 'number' ? length : 0),
            stop_sequence: this.constructStopSequence(),
        }
    }
    inference = async () => {
        const endpoint = this.getString(Global.CompletionsEndpoint)
        const key = this.getString(Global.CompletionsKey)

        Logger.log(`Using endpoint: Text Completions`)
        this.readableStreamResponse(
            new URL('/v1/completions', endpoint).toString(),
            JSON.stringify(this.buildPayload()),
            (item) => {
                const output = JSON.parse(item)
                return output?.choices?.[0]?.text ?? output?.content ?? ''
            },
            () => {},
            { Authorization: `Bearer ${key}` }
        )
    }
}

const textCompletionAPI = new TextCompletionAPI()
export default textCompletionAPI
