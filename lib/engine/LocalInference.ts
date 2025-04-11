import Alert from '@components/views/Alert'
import { AppSettings } from '@lib/constants/GlobalValues'
import { SamplerConfigData, SamplerID, Samplers } from '@lib/constants/SamplerData'
import { Characters } from '@lib/state/Characters'
import { Chats, useInference } from '@lib/state/Chat'
import { Instructs, InstructType } from '@lib/state/Instructs'
import { Logger } from '@lib/state/Logger'
import { SamplersManager } from '@lib/state/SamplerState'
import { useTTSState } from '@lib/state/TTS'
import { mmkv } from '@lib/storage/MMKV'
import { CompletionTimings } from 'db/schema'

import { APIConfiguration, APISampler, APIValues } from './API/APIBuilder.types'
import { buildChatCompletionContext, buildTextCompletionContext } from './API/ContextBuilder'
import { Llama, LlamaConfig } from './Local/LlamaLocal'
import { KV } from './Local/Model'

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

const buildLocalPayload = async () => {
    const payloadFields = getSamplerFields()
    const rep_pen = payloadFields?.['penalty_repeat']
    const n_predict =
        (typeof payloadFields?.['n_predict'] === 'number' && payloadFields?.['n_predict']) || 0
    const localPreset: LlamaConfig = Llama.useEngineData.getState().config

    let prompt: undefined | string = undefined

    if (mmkv.getBoolean(AppSettings.UseModelTemplate)) {
        const messages = buildChatCompletionContext(
            localPreset.context_length - n_predict,
            localAPIConfig,
            localAPIValues
        )
        try {
            if (messages) {
                const result = await Llama.useLlama
                    .getState()
                    .context?.getFormattedChat(messages, null, { jinja: true })
                if (typeof result === 'string') prompt = result
                // Currently not used since we dont pass in { jinja: true }
                else if (typeof result === 'object') prompt = result.prompt
            }
        } catch (e) {
            Logger.error(`Failed to use template: ${e}`)
        }
    }
    if (!prompt) {
        prompt = buildTextCompletionContext(localPreset.context_length - n_predict)
    }

    if (!prompt) {
        Logger.errorToast('Failed to build prompt')
    }

    return {
        ...payloadFields,
        penalize_nl: typeof rep_pen === 'number' && rep_pen > 1,
        n_threads: localPreset.threads,
        prompt: prompt ?? '',
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

const verifyModelLoaded = async (): Promise<boolean> => {
    const model = Llama.useLlama.getState().model

    // Model Loading Routine
    if (!model) {
        const lastModel = Llama.useEngineData.getState().lastModel
        const autoLoad = mmkv.getBoolean(AppSettings.AutoLoadLocal)
        // If  autoload is disabled, just return
        if (!autoLoad) {
            Logger.warnToast('No Model Loaded')
            return false
        }

        // by default, autoload will attempt to load the last model used
        if (!lastModel) {
            Logger.warnToast('No Auto-Load Model Set')
            return false
        }

        // attempt to load model
        if (lastModel) {
            Logger.infoToast(`Auto-loading: ${lastModel.name}`)
            await Llama.useLlama.getState().load(lastModel)
        }
    }
    return true
}

export const localInference = async () => {
    // Model Loading Routine
    if (!(await verifyModelLoaded())) {
        return stopGenerating()
    }

    // verify that model has been loaded
    const context = Llama.useLlama.getState().context

    if (!context) {
        Logger.warnToast('No Model Loaded')
        stopGenerating()
        return
    }

    const payload = await buildLocalPayload()

    if (!payload) {
        Logger.warnToast('Failed to build payload')
        stopGenerating()
        return
    }

    if (mmkv.getBoolean(AppSettings.SaveLocalKV) && !KV.useKVState.getState().kvCacheLoaded) {
        const prompt = Llama.useLlama.getState().tokenize(payload.prompt)
        const result = KV.useKVState.getState().verifyKVCache(prompt?.tokens ?? [])
        if (!result.match) {
            Alert.alert({
                title: 'Cache Mismatch',
                description: `KV Cache does not match current prompt:\n\n${result.matchLength} of ${result.cachedLength} tokens are identical.\n\nPress 'Load Anyway' if you don't mind losing the cache.`,
                buttons: [
                    { label: 'Cancel', onPress: stopGenerating },
                    {
                        label: 'Load Anyway',
                        onPress: async () => {
                            Logger.warn('Overriding KV Cache despite mismatch')
                            const result = await Llama.useLlama.getState().loadKV()
                            if (result) {
                                KV.useKVState.getState().setKvCacheLoaded(true)
                            }
                            runLocalCompletion(payload)
                        },
                        type: 'warning',
                    },
                ],
                onDismiss: stopGenerating,
            })
            return
        }

        const kvloadResult = await Llama.useLlama.getState().loadKV()
        if (kvloadResult) {
            KV.useKVState.getState().setKvCacheLoaded(true)
        }
    }
    await runLocalCompletion(payload)
}

const runLocalCompletion = async (payload: Awaited<ReturnType<typeof buildLocalPayload>>) => {
    const replace = RegExp(
        constructReplaceStrings()
            .map((item) => item.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'))
            .join(`|`),
        'g'
    )

    useInference.getState().setAbort(async () => {
        await Llama.useLlama.getState().stopCompletion()
    })

    const outputStream = (text: string) => {
        Chats.useChatState.getState().insertBuffer(text)
        useTTSState.getState().insertBuffer(text)
    }

    const outputCompleted = (text: string, timings: CompletionTimings) => {
        const regenCache = Chats.useChatState.getState().getRegenCache()
        Chats.useChatState
            .getState()
            .setBuffer({ data: (regenCache + text).replaceAll(replace, ''), timings: timings })
        if (mmkv.getBoolean(AppSettings.PrintContext)) Logger.info(`Completion Output:\n${text}`)
        stopGenerating()
    }

    await Llama.useLlama
        .getState()
        .completion(payload, outputStream, outputCompleted)
        .catch((error) => {
            Logger.errorToast(`Failed to generate locally: ${error}`)
            stopGenerating()
        })
}

const localAPIValues: APIValues = {
    endpoint: '',
    modelEndpoint: '',
    prefill: '',
    firstMessage: '',
    key: '',
    model: undefined,
    configName: 'Local',
}

// This is a dummy we use to hijack chat completions builder
const localAPIConfig: APIConfiguration = {
    version: 1,
    name: 'Local',

    defaultValues: {
        endpoint: '',
        modelEndpoint: '',
        prefill: '',
        firstMessage: '',
        key: '',
        model: undefined,
    },

    features: {
        usePrefill: false,
        useFirstMessage: false,
        useKey: true,
        useModel: true,
        multipleModels: false,
    },

    request: {
        requestType: 'stream',
        samplerFields: [],
        completionType: {
            type: 'chatCompletions',
            userRole: 'user',
            systemRole: 'system',
            assistantRole: 'assistant',
            contentName: 'content',
        },
        authHeader: 'Authorization',
        authPrefix: 'Bearer ',
        responseParsePattern: 'choices.0.delta.content',
        useStop: true,
        stopKey: 'stop',
        promptKey: 'messages',
        removeLength: true,
    },

    payload: {
        type: 'openai',
    },

    model: {
        useModelContextLength: false,
        nameParser: '',
        contextSizeParser: '',
        modelListParser: '',
    },

    ui: {
        editableCompletionPath: false,
        editableModelPath: false,
        selectableModel: false,
    },
}
