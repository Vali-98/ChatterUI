import { AppSettings, Global } from '@constants/GlobalValues'
import { Chats, useInference } from 'app/constants/Chat'
import { Llama, LlamaPreset } from 'app/constants/LlamaLocal'
import { Logger } from 'app/constants/Logger'
import { mmkv } from 'app/constants/MMKV'
import { SamplerID } from 'app/constants/SamplerData'
import { ModelDataType } from 'db/schema'
import BackgroundService from 'react-native-background-actions'

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
        { externalName: 'xtc_t', samplerID: SamplerID.XTC_THRESHOLD },
        { externalName: 'xtc_p', samplerID: SamplerID.XTC_PROBABILITY },
        { externalName: 'seed', samplerID: SamplerID.SEED },
    ]
    buildPayload = () => {
        const payloadFields = this.getSamplerFields()
        const rep_pen = payloadFields?.['penalty_repeat']
        const n_predict =
            (typeof payloadFields?.['n_predict'] === 'number' && payloadFields?.['n_predict']) || 0

        const localPreset: LlamaPreset = this.getObject(Global.LocalPreset)
        return {
            ...payloadFields,
            penalize_nl: typeof rep_pen === 'number' && rep_pen > 1,
            n_threads: localPreset.threads,
            prompt: this.buildTextCompletionContext(localPreset.context_length - n_predict),
            stop: this.constructStopSequence(),
            emit_partial_completion: true,
        }
    }

    inference = async () => {
        let context = Llama.useLlama.getState().context
        if (!context && mmkv.getBoolean(AppSettings.AutoLoadLocal)) {
            let model: undefined | ModelDataType = undefined

            try {
                const modelString = mmkv.getString(Global.LocalModel)
                if (!modelString) return
                model = JSON.parse(modelString)
            } catch (e) {
                Logger.log('Failed to auto-load model')
            }

            const params = this.getObject(Global.LocalPreset)
            if (model && params) {
                await Llama.useLlama.getState().load(model)
                context = Llama.useLlama.getState().context
            }
        }

        if (!context) {
            Logger.log('No Model Loaded', true)
            this.stopGenerating()
            return
        }

        const loadKV =
            mmkv.getBoolean(AppSettings.SaveLocalKV) && !mmkv.getBoolean(Global.LocalSessionLoaded)

        if (loadKV) {
            await Llama.useLlama.getState().loadKV()
            mmkv.set(Global.LocalSessionLoaded, true)
        }

        const replace = RegExp(
            this.constructReplaceStrings()
                .map((item) => item.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'))
                .join(`|`),
            'g'
        )

        useInference.getState().setAbort(async () => {
            await Llama.useLlama.getState().stopCompletion()
        })

        const payload = this.buildPayload()

        const outputStream = (text: string) => {
            const output = Chats.useChat.getState().buffer + text
            Chats.useChat.getState().setBuffer(output.replaceAll(replace, ''))
        }

        const outputCompleted = (text: string) => {
            const regenCache = Chats.useChat.getState().getRegenCache()
            Chats.useChat.getState().setBuffer((regenCache + text).replaceAll(replace, ''))
            if (mmkv.getBoolean(AppSettings.PrintContext)) Logger.log(`Completion Output:\n${text}`)
            this.stopGenerating()
        }

        const completionTask = async () => {
            await Llama.useLlama
                .getState()
                .completion(payload, outputStream, outputCompleted)
                .catch((error) => {
                    Logger.log(`Failed to generate locally: ${error}`, true)
                    this.stopGenerating()
                })
        }

        const options = {
            taskName: 'rn_llama_completion',
            taskTitle: 'Running completion...',
            taskDesc: 'ChatterUI is running a completion task',
            taskIcon: {
                name: 'ic_launcher',
                type: 'mipmap',
            },
            color: '#403737',
            linkingURI: 'chatterui://',
            progressBar: {
                max: 1,
                value: 0,
                indeterminate: true,
            },
        }

        await BackgroundService.start(completionTask, options)
    }
}

const localAPI = new LocalAPI()
export default localAPI
