import { AppSettings, Global } from '@lib/constants/GlobalValues'
import { SamplerConfigData, SamplerID, Samplers } from '@lib/constants/SamplerData'
import { Characters } from '@lib/state/Characters'
import { Chats, useInference } from '@lib/state/Chat'
import { Instructs, InstructType } from '@lib/state/Instructs'
import { Logger } from '@lib/state/Logger'
import { SamplersManager } from '@lib/state/SamplerState'
import { mmkv } from '@lib/storage/MMKV'
import { ModelDataType } from 'db/schema'

import { APISampler } from './API/APIBuilder.types'
import { buildTextCompletionContext } from './API/ContextBuilder'
import { Llama, LlamaPreset } from './LlamaLocal'

export const localSamplerData: APISampler[] = [
    { externalName: 'n_predict', samplerID: SamplerID.GENERATED_LENGTH },
    { externalName: 'temperature', samplerID: SamplerID.TEMPERATURE },
    { externalName: 'top_p', samplerID: SamplerID.TOP_P },
    { externalName: 'top_k', samplerID: SamplerID.TOP_K },
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
    { externalName: 'dry_base', samplerID: SamplerID.DRY_BASE },
    { externalName: 'dry_allowed_length', samplerID: SamplerID.DRY_ALLOWED_LENGTH },
    { externalName: 'dry_multiplier', samplerID: SamplerID.DRY_MULTIPLIER },
    { externalName: 'dry_sequence_breakers', samplerID: SamplerID.DRY_SEQUENCE_BREAK },
]

const getLocalPreset = (): LlamaPreset => {
    const presetString = mmkv.getString(Global.LocalPreset)
    return presetString
        ? (JSON.parse(presetString) as LlamaPreset)
        : {
              context_length: 4096,
              threads: 4,
              gpu_layers: 0,
              batch: 512,
          }
}

const getSamplerFields = (max_length?: number) => {
    const preset: SamplerConfigData = SamplersManager.getCurrentSampler()
    return localSamplerData
        .map((item: APISampler) => {
            const value = preset[item.samplerID]
            const samplerItem = Samplers[item.samplerID]
            let cleanvalue = value
            if (typeof value === 'number')
                if (item.samplerID === 'max_length' && max_length) {
                    cleanvalue = Math.min(value, max_length)
                } else if (samplerItem.values.type === 'integer') cleanvalue = Math.floor(value)
            if (item.samplerID === SamplerID.DRY_SEQUENCE_BREAK) {
                cleanvalue = (value as string).split(',')
            }
            return { [item.externalName as SamplerID]: cleanvalue }
        })
        .reduce((acc, obj) => Object.assign(acc, obj), {})
}

const buildLocalPayload = () => {
    const payloadFields = getSamplerFields()
    const rep_pen = payloadFields?.['penalty_repeat']
    const n_predict =
        (typeof payloadFields?.['n_predict'] === 'number' && payloadFields?.['n_predict']) || 0
    const presetString = mmkv.getString(Global.LocalPreset)
    const localPreset: LlamaPreset = getLocalPreset()
    return {
        ...payloadFields,
        penalize_nl: typeof rep_pen === 'number' && rep_pen > 1,
        n_threads: localPreset.threads,
        prompt: buildTextCompletionContext(localPreset.context_length - n_predict),
        stop: constructStopSequence(),
        emit_partial_completion: true,
    }
}

const constructStopSequence = (): string[] => {
    const instruct = Instructs.useInstruct.getState().replacedMacros()
    const sequence: string[] = []
    if (instruct.stop_sequence !== '')
        instruct.stop_sequence.split(',').forEach((item) => item !== '' && sequence.push(item))
    return sequence
}

const stopGenerating = () => {
    Chats.useChatState.getState().stopGenerating()
}

const constructReplaceStrings = (): string[] => {
    const currentInstruct: InstructType = Instructs.useInstruct.getState().replacedMacros()
    // default stop strings defined instructs
    const stops: string[] = constructStopSequence()
    // additional stop strings based on context configuration
    const output: string[] = []

    if (currentInstruct.names) {
        const userName = Characters.useCharacterCard.getState().card?.name ?? ''
        const charName: string = Characters.useCharacterCard.getState()?.card?.name ?? ''
        output.push(`${userName} :`)
        output.push(`${charName} :`)
    }
    return [...stops, ...output]
}

export const localInference = async () => {
    let context = Llama.useLlama.getState().context

    let model: undefined | ModelDataType = undefined

    try {
        const modelString = mmkv.getString(Global.LocalModel)
        if (!modelString) {
            Logger.log('No Auto-Load Model Set', true)
            return
        }
        model = JSON.parse(modelString)
    } catch (e) {
        Logger.log('Failed to Auto-Load Model', true)
    }

    if (model && !context && mmkv.getBoolean(AppSettings.AutoLoadLocal)) {
        const params = getLocalPreset()
        if (params) {
            Logger.log(`Auto-loading: ${model.name}`, true)
            await Llama.useLlama.getState().load(model)
            context = Llama.useLlama.getState().context
        }
    }

    if (!context) {
        Logger.log('No Model Loaded', true)
        stopGenerating()
        return
    }

    const loadKV =
        mmkv.getBoolean(AppSettings.SaveLocalKV) && !mmkv.getBoolean(Global.LocalSessionLoaded)

    if (loadKV) {
        await Llama.useLlama.getState().loadKV()
        mmkv.set(Global.LocalSessionLoaded, true)
    }

    const replace = RegExp(
        constructReplaceStrings()
            .map((item) => item.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'))
            .join(`|`),
        'g'
    )

    useInference.getState().setAbort(async () => {
        await Llama.useLlama.getState().stopCompletion()
    })

    const payload = buildLocalPayload()

    const outputStream = (text: string) => {
        const output = Chats.useChatState.getState().buffer + text
        Chats.useChatState.getState().setBuffer(output.replaceAll(replace, ''))
    }

    const outputCompleted = (text: string) => {
        const regenCache = Chats.useChatState.getState().getRegenCache()
        Chats.useChatState.getState().setBuffer((regenCache + text).replaceAll(replace, ''))
        if (mmkv.getBoolean(AppSettings.PrintContext)) Logger.log(`Completion Output:\n${text}`)
        stopGenerating()
    }

    await Llama.useLlama
        .getState()
        .completion(payload, outputStream, outputCompleted)
        .catch((error) => {
            Logger.log(`Failed to generate locally: ${error}`, true)
            stopGenerating()
        })
}
