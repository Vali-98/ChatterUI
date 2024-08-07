import { Chats, useInference } from '@constants/Chat'
import { Global } from '@constants/GlobalValues'
import { Logger } from '@constants/Logger'
import { SamplerID } from '@constants/Samplers'
import { Llama } from '@constants/llama'

import { APIBase, APISampler } from './BaseAPI'

class LocalAPI extends APIBase {
    samplers: APISampler[] = [
        { externalName: 'n_predict', samplerID: SamplerID.GENERATED_LENGTH },
        { externalName: 'repeat_penalty', samplerID: SamplerID.REPETITION_PENALTY },
        { externalName: 'temperature', samplerID: SamplerID.TEMPERATURE },
        { externalName: 'tfs_z', samplerID: SamplerID.TAIL_FREE_SAMPLING },
        { externalName: 'top_p', samplerID: SamplerID.TOP_P },
        { externalName: 'top_k', samplerID: SamplerID.TOP_K },
        { externalName: 'typical_p', samplerID: SamplerID.TYPICAL },
        { externalName: 'seed', samplerID: SamplerID.SEED },
        { externalName: 'mirostat', samplerID: SamplerID.MIROSTAT_MODE },
        { externalName: 'mirostat_tau', samplerID: SamplerID.MIROSTAT_TAU },
        { externalName: 'mirostat_eta', samplerID: SamplerID.MIROSTAT_ETA },
        { externalName: 'min_p', samplerID: SamplerID.MIN_P },
        { externalName: 'grammar', samplerID: SamplerID.GRAMMAR_STRING },
        { externalName: 'use_default_badwordids', samplerID: SamplerID.BAN_EOS_TOKEN },
        { externalName: 'dynatemp_range', samplerID: SamplerID.DYNATEMP_RANGE },
        { externalName: 'smooth_range', samplerID: SamplerID.SMOOTHING_FACTOR },
        { externalName: 'presence_penalty', samplerID: SamplerID.PRESENCE_PENALTY },
        { externalName: 'frequency_penalty', samplerID: SamplerID.FREQUENCY_PENALTY },
        { externalName: 'sampler_seed', samplerID: SamplerID.SEED },
    ]
    buildPayload = () => {
        const payloadFields = this.getSamplerFields()
        const length = payloadFields?.['max_context_length']
        const localPreset = this.getObject(Global.LocalPreset)
        return {
            ...payloadFields,
            n_threads: localPreset.threads,
            prompt: this.buildTextCompletionContext(typeof length === 'number' ? length : 0),
            stop_sequence: this.constructStopSequence(),
        }
    }
    inference = async () => {
        const replace = RegExp(
            this.constructReplaceStrings()
                .map((item) => item.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'))
                .join(`|`),
            'g'
        )

        useInference.getState().setAbort(async () => {
            Llama.stopCompletion()
        })

        const payload = this.buildPayload()
        Llama.completion(payload, (text: string) => {
            const output = Chats.useChat.getState().buffer + text
            Chats.useChat.getState().setBuffer(output.replaceAll(replace, ''))
        })
            .then(() => {
                this.stopGenerating()
            })
            .catch((error) => {
                Logger.log(`Failed to generate locally: ${error}`, true)
                this.stopGenerating()
            })
    }
}

const localAPI = new LocalAPI()
export default localAPI
