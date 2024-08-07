import { Chats, useInference } from '@constants/Chat'
import { AppSettings, Global } from '@constants/GlobalValues'
import { Logger } from '@constants/Logger'
import { SamplerID } from '@constants/Samplers'
import { Llama } from '@constants/llama'
import { mmkv } from '@constants/mmkv'

import { APIBase, APISampler } from './BaseAPI'

class LocalAPI extends APIBase {
    samplers: APISampler[] = [
        { externalName: 'n_predict', samplerID: SamplerID.GENERATED_LENGTH },
        { externalName: 'temperature', samplerID: SamplerID.TEMPERATURE },
        { externalName: 'top_p', samplerID: SamplerID.TOP_P },
        { externalName: 'top_k', samplerID: SamplerID.TOP_K },
        { externalName: 'tfs_z', samplerID: SamplerID.TAIL_FREE_SAMPLING },
        { externalName: 'min_p', samplerID: SamplerID.MIN_P },
        { externalName: 'typical_p', samplerID: SamplerID.TYPICAL },
        { externalName: 'mirostat', samplerID: SamplerID.MIROSTAT_MODE },
        { externalName: 'mirostat_tau', samplerID: SamplerID.MIROSTAT_TAU },
        { externalName: 'mirostat_eta', samplerID: SamplerID.MIROSTAT_ETA },
        { externalName: 'grammar', samplerID: SamplerID.GRAMMAR_STRING },
        { externalName: 'penalty_last_n', samplerID: SamplerID.REPETITION_PENALTY_RANGE },
        { externalName: 'penalty_repeat', samplerID: SamplerID.REPETITION_PENALTY },
        { externalName: 'penalty_present', samplerID: SamplerID.PRESENCE_PENALTY },
        { externalName: 'penalty_freq', samplerID: SamplerID.FREQUENCY_PENALTY },
        { externalName: 'seed', samplerID: SamplerID.SEED },
    ]
    buildPayload = () => {
        const payloadFields = this.getSamplerFields()
        const rep_pen = payloadFields?.['penalty_repeat']
        const localPreset: Llama.LlamaPreset = this.getObject(Global.LocalPreset)
        return {
            ...payloadFields,
            penalize_nl: typeof rep_pen === 'number' && rep_pen > 1,
            n_threads: localPreset.threads,
            prompt: this.buildTextCompletionContext(localPreset.context_length),
            stop: this.constructStopSequence(),
            emit_partial_completion: true,
        }
    }

    inference = async () => {
        if (!Llama.isModelLoaded(false) && mmkv.getBoolean(AppSettings.AutoLoadLocal)) {
            const model = mmkv.getString(Global.LocalModel)
            const params = this.getObject(Global.LocalPreset)
            if (model && params) await Llama.loadModel(model, params)
        }

        if (!Llama.isModelLoaded()) {
            this.stopGenerating()
            return
        }

        const loadKV =
            mmkv.getBoolean(AppSettings.SaveLocalKV) && !mmkv.getBoolean(Global.LocalSessionLoaded)

        if (loadKV) {
            await Llama.loadKV()
            mmkv.set(Global.LocalSessionLoaded, true)
        }

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
