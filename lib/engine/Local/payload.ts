import { JinjaFormattedChatResult } from 'cui-llama.rn'
import { t } from 'i18next'

import { SamplerConfigData, SamplerID, Samplers } from '@lib/constants/SamplerData'
import { commonStopStrings, outputPrefixes } from '@lib/state/Instructs'
import { Logger } from '@lib/state/Logger'

import { Llama, LlamaConfig } from './LlamaLocal'
import { APIConfiguration, APISampler, APIValues } from '../API/APIBuilder.types'
import {
    buildChatCompletionContext,
    buildTextCompletionContext,
    ContextBuilderParams,
} from '../API/ContextBuilder'
import { prepareGenerationContext, type GenerationInputs } from '../generation/inputs'

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
    { externalName: 'enable_thinking', samplerID: SamplerID.ENABLE_THINKING },
    { externalName: 'penalty_freq', samplerID: SamplerID.FREQUENCY_PENALTY },
    { externalName: 'xtc_t', samplerID: SamplerID.XTC_THRESHOLD },
    { externalName: 'xtc_p', samplerID: SamplerID.XTC_PROBABILITY },
    { externalName: 'seed', samplerID: SamplerID.SEED },
    { externalName: 'dry_base', samplerID: SamplerID.DRY_BASE },
    { externalName: 'dry_allowed_length', samplerID: SamplerID.DRY_ALLOWED_LENGTH },
    { externalName: 'dry_multiplier', samplerID: SamplerID.DRY_MULTIPLIER },
    { externalName: 'dry_sequence_breakers', samplerID: SamplerID.DRY_SEQUENCE_BREAK },
    { externalName: 'thinking_budget_tokens', samplerID: SamplerID.REASONING_MAX_TOKENS },
]

const getSamplerFields = (preset: SamplerConfigData, max_length?: number) => {
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
                //@ts-expect-error. This is due to a migration
                cleanvalue = (value as string).split(',')
            }
            return { [item.externalName as SamplerID]: cleanvalue }
        })
        .reduce((acc, obj) => Object.assign(acc, obj), {})
}

export const buildLocalPayload = async (
    inputs: GenerationInputs,
    options: { continuing?: boolean; recordStats?: boolean } = {}
) => {
    const bufferExists = !!options.continuing
    const payloadFields = getSamplerFields(inputs.samplers)
    const rep_pen = payloadFields?.['penalty_repeat']
    const reasoning = payloadFields?.['enable_thinking'] as boolean
    let thinkTags = {}
    const localPreset: LlamaConfig = inputs.localConfig
    let prompt: undefined | string = undefined
    let mediaPaths: string[] = []
    const context = Llama.useLlamaModelStore.getState().context

    const fields = await obtainFields(inputs, options.recordStats)

    if (!fields) {
        return Logger.error('Failed to build fields')
    }

    const { apiConfig, ...rest } = fields

    const completionType = { ...apiConfig.request.completionType }
    apiConfig.request.completionType = completionType
    if (completionType.type === 'chatCompletions') {
        completionType.supportsAudio = false
        completionType.supportsImages = false
    }
    if (context && (await context.isMultimodalEnabled())) {
        const mtmdSupport = await context.getMultimodalSupport()
        if (completionType.type === 'chatCompletions') {
            completionType.supportsAudio = mtmdSupport?.audio
            completionType.supportsImages = mtmdSupport?.vision
            apiConfig.request.completionType = completionType
        }
    }
    const hasAudio = completionType.type === 'chatCompletions' && completionType.supportsAudio
    const hasImage = completionType.type === 'chatCompletions' && completionType.supportsImages

    if (inputs.useModelTemplate) {
        const messages = await buildChatCompletionContext({ apiConfig, ...rest })
        try {
            if (messages) {
                const result = await Llama.useLlamaModelStore
                    .getState()
                    .context?.getFormattedChat(messages, null, {
                        jinja: true,
                        enable_thinking: reasoning,
                    })
                if (typeof result === 'string') prompt = result
                else if (typeof result === 'object') {
                    prompt = result.prompt
                    mediaPaths = result.media_paths ?? []
                    if (reasoning && result.type === 'jinja') {
                        const jinjaResult = result as JinjaFormattedChatResult
                        const thinking_end_tag = jinjaResult.thinking_end_tag
                        const thinking_start_tag = jinjaResult.thinking_start_tag
                        const thinking_forced_open = true

                        if (thinking_end_tag && thinking_start_tag)
                            thinkTags = {
                                thinking_end_tag,
                                thinking_start_tag,
                                thinking_forced_open,
                            }
                    }

                    if (mediaPaths.length > 0 && !hasImage && !hasAudio) {
                        Logger.warnToast(t('model.toast.mediaAddedWithoutMultimodalSupport'))
                    }
                }
            }
        } catch (e) {
            Logger.error(`Failed to use template: ${e}`)
        }

        // we assume that if the buffer is filled during completion
        // this is a continue sequence
        // we need to remove the trailing <close_tag> and <think> tags
        if (bufferExists && prompt) {
            const removalList = ['<think>', ...outputPrefixes, ...commonStopStrings]
            let trimmedInput = prompt.trim()
            for (const removal of removalList) {
                const test = removal.trim()
                if (trimmedInput.endsWith(test)) {
                    const matchIndex = trimmedInput.lastIndexOf(test)
                    if (matchIndex !== -1) {
                        trimmedInput = trimmedInput.slice(0, matchIndex).trim()
                    }
                }
            }
            prompt = trimmedInput
        }
    }
    if (!prompt) {
        prompt = await buildTextCompletionContext({ apiConfig, ...rest })
    }

    if (!prompt) {
        Logger.errorToast(t('generation.errors.failedToBuildPrompt'))
        return
    }

    const finalMediaPaths = hasAudio || hasImage ? { media_paths: mediaPaths } : {}

    return {
        ...payloadFields,
        penalize_nl: typeof rep_pen === 'number' && rep_pen > 1,
        n_threads: localPreset.threads,
        prompt: prompt ?? '',
        stop: inputs.stopSequence,
        emit_partial_completion: true,
        ...finalMediaPaths,
        ...thinkTags,
    }
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

const obtainFields = async (
    inputs: GenerationInputs,
    recordStats = true
): Promise<ContextBuilderParams> => ({
    ...(await prepareGenerationContext(inputs, { recordStats })),
    apiConfig: {
        ...localAPIConfig,
        request: {
            ...localAPIConfig.request,
            completionType: { ...localAPIConfig.request.completionType },
        },
    },
    apiValues: { ...localAPIValues },
    maxLength: Math.max(0, inputs.localConfig.context_length - inputs.samplers.genamt),
})
