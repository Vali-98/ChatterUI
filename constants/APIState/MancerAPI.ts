import { Global } from 'constants/GlobalValues'
import { Logger } from 'constants/Logger'
import { SamplerID } from 'constants/SamplerData'

import { APIBase, APISampler } from './BaseAPI'

class MancerAPI extends APIBase {
    //TODO: Mancer does have new fields
    samplers: APISampler[] = [
        { externalName: 'max_context_length', samplerID: SamplerID.CONTEXT_LENGTH },
        { externalName: 'max_tokens', samplerID: SamplerID.GENERATED_LENGTH },
        { externalName: 'repetition_penalty', samplerID: SamplerID.REPETITION_PENALTY },
        { externalName: 'temperature', samplerID: SamplerID.TEMPERATURE },
        { externalName: 'top_a', samplerID: SamplerID.TOP_A },
        { externalName: 'top_p', samplerID: SamplerID.TOP_P },
        { externalName: 'top_k', samplerID: SamplerID.TOP_K },
        { externalName: 'tfs', samplerID: SamplerID.TAIL_FREE_SAMPLING },
        { externalName: 'typical_p', samplerID: SamplerID.TYPICAL },
        { externalName: 'mirostat', samplerID: SamplerID.MIROSTAT_MODE },
        { externalName: 'mirostat_tau', samplerID: SamplerID.MIROSTAT_TAU },
        { externalName: 'mirostat_eta', samplerID: SamplerID.MIROSTAT_ETA },
        { externalName: 'min_p', samplerID: SamplerID.MIN_P },
        { externalName: 'stream', samplerID: SamplerID.STREAMING },
        { externalName: 'use_default_badwordids', samplerID: SamplerID.BAN_EOS_TOKEN },
    ]
    buildPayload = () => {
        const mancerModel = this.getObject(Global.MancerModel)

        const payloadFields = this.getSamplerFields(mancerModel.limits.context)
        const length = payloadFields?.['max_context_length']
        const limit = payloadFields?.['max_tokens']

        return {
            ...payloadFields,
            model: mancerModel.id,
            max_tokens:
                typeof limit === 'number'
                    ? Math.min(limit, mancerModel.limits.completion)
                    : mancerModel.limits.completion,
            prompt: this.buildTextCompletionContext(typeof length === 'number' ? length : 0),
            stop_sequence: this.constructStopSequence(),
            n: 1,
        }
    }
    inference = async () => {
        const mancerKey = this.getString(Global.MancerKey)
        const mancerModel = this.getObject(Global.MancerModel)
        Logger.log(`Using endpoint: Mancer`)

        const check = await fetch(`https://neuro.mancer.tech/oai/v1/models/${mancerModel.id}`, {
            method: 'GET',
            headers: { 'X-API-KEY': mancerKey },
        })

        if (check.status !== 200) {
            Logger.log(await check.json())
            this.stopGenerating()
            Logger.log(`Invalid Model or API key!`, true)
            return
        }

        this.readableStreamResponse(
            `https://neuro.mancer.tech/oai/v1/completions`,
            JSON.stringify(this.buildPayload()),
            (item) => {
                if (item === 'data: [DONE]') return ''
                return JSON.parse(item).choices[0].text
            },
            () => {},
            { 'X-API-KEY': mancerKey }
        )
    }
}

const mancerAPI = new MancerAPI()
export default mancerAPI
