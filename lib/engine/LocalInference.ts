import { JinjaFormattedChatResult } from 'cui-llama.rn'
import { t } from 'i18next'

import Alert from '@components/views/Alert'
import { CompletionTimings } from '@db/schema'
import { AppSettings } from '@lib/constants/GlobalValues'
import { SamplerConfigData, SamplerID, Samplers } from '@lib/constants/SamplerData'
import { commonStopStrings, outputPrefixes } from '@lib/state/Instructs'
import { Logger } from '@lib/state/Logger'
import { mmkv } from '@lib/storage/MMKV'

import type { CompletionReason } from './API/APIBuilder'
import { APIConfiguration, APISampler, APIValues } from './API/APIBuilder.types'
import {
    buildChatCompletionContext,
    buildTextCompletionContext,
    ContextBuilderParams,
} from './API/ContextBuilder'
import { prepareGenerationContext, type GenerationInputs } from './generation/inputs'
import { finishGeneration } from './generation/lifecycle'
import { getGenerationRuntime } from './generation/runtime'
import {
    appendGeneration,
    enableGenerationInlineReasoning,
    primeGenerationReasoning,
    isActiveGeneration,
    updateGeneration,
    useGenerationState,
} from './generation/state'
import { Llama, LlamaConfig } from './Local/LlamaLocal'
import { KV, Model } from './Local/Model'
import { createStopFilter } from './stopSequenceFilter'

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

const buildLocalPayload = async (generationId: number, inputs: GenerationInputs) => {
    const payloadFields = getSamplerFields(inputs.samplers)
    const rep_pen = payloadFields?.['penalty_repeat']
    const reasoning = payloadFields?.['enable_thinking'] as boolean
    let thinkTags = {}
    const localPreset: LlamaConfig = inputs.localConfig
    let prompt: undefined | string = undefined
    let mediaPaths: string[] = []
    const context = Llama.useLlamaModelStore.getState().context

    const fields = await obtainFields(inputs)

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
    const bufferExists = !!useGenerationState.getState().generations[generationId]?.text

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

const maybeLoadLinkedModel = async (
    characterId: number,
    generationId: number,
    inputs: GenerationInputs
) => {
    if (!characterId) return false
    const links = inputs.character.links
    const modelLink = links.find((link) => link.type === 'model_id')
    if (!modelLink) return false
    const model = await Model.getModelWithMMProj(modelLink.value)
    if (!model) return false
    Logger.infoToast(t('model.toast.autoLoadingModel', { name: model.name }))
    await Llama.useLlamaModelStore
        .getState()
        .load(model, { generationId: generationId, config: inputs.localConfig })
    return true
}

const verifyModelLoaded = async (
    inputs: GenerationInputs,
    generationId: number
): Promise<boolean> => {
    const model = Llama.useLlamaModelStore.getState().model
    if (inputs.localModel && inputs.localModel.id !== model?.id)
        throw new Error('Local model changed before generation execution')

    // Model Loading Routine, also check for character linked model
    if (model || (await maybeLoadLinkedModel(inputs.character.id, generationId, inputs)))
        return true

    const lastModel = inputs.lastLocalModel
    const autoLoad = inputs.autoLoadLocal

    // If  autoload is disabled, just return
    if (!autoLoad || !lastModel) {
        Logger.warnToast(
            !autoLoad ? t('model.toast.noModelLoaded') : t('model.toast.noAutoLoadModelSet')
        )
        return false
    }

    // attempt to load model
    Logger.infoToast(t('model.toast.autoLoadingModel', { name: lastModel.name }))
    await Llama.useLlamaModelStore
        .getState()
        .load(lastModel, { generationId: generationId, config: inputs.localConfig })

    return true
}

export const localInference = async (generationId: number, inputs: GenerationInputs) => {
    let reason: CompletionReason = 'failed'
    const cancelled = () => reason === 'cancelled'
    let cancelDecision: (() => void) | undefined
    const runtime = getGenerationRuntime(generationId)
    const current = () => {
        const generation = useGenerationState.getState().generations[generationId]
        return !!generation && isActiveGeneration(generation) && !runtime.controller.signal.aborted
    }
    const generation = useGenerationState.getState().generations[generationId]
    if (!generation || !isActiveGeneration(generation)) return
    const stop = (reason: CompletionReason) => finishGeneration(generationId, reason)
    const onAbort = () => {
        reason = 'cancelled'
        cancelDecision?.()
    }
    runtime.controller.signal.addEventListener('abort', onAbort)
    if (runtime.controller.signal.aborted) onAbort()
    try {
        if (cancelled()) return
        if (!(await verifyModelLoaded(inputs, generationId)) || cancelled() || !current()) return
        const context = Llama.useLlamaModelStore.getState().context
        if (!context) {
            Logger.warnToast(t('model.toast.noModelLoaded'))
            return
        }
        inputs.activateLocalTokenizer()
        const payload = await buildLocalPayload(generationId, inputs)
        if (cancelled() || !current()) return
        if (!payload) {
            Logger.warnToast(t('generation.errors.failedToBuildPayload'))
            return
        }
        if (inputs.saveLocalKV && !KV.useKVStore.getState().kvCacheLoaded) {
            const prompt = await Llama.useLlamaModelStore
                .getState()
                .tokenize(payload.prompt, payload.media_paths)
            if (cancelled() || !current()) return
            const result = KV.useKVStore.getState().verifyKVCache(prompt?.tokens ?? [])
            if (!result.match) {
                const proceed = await new Promise<boolean>((resolve) => {
                    cancelDecision = () => resolve(false)
                    Alert.alert({
                        title: 'Cache Mismatch',
                        description: `KV Cache does not match current prompt:\n\n${result.matchLength} of ${result.cachedLength} tokens are identical.\n\nPress 'Load Anyway' if you don't mind losing the cache.`,
                        buttons: [
                            { label: 'Cancel', onPress: () => resolve(false) },
                            { label: 'Load Anyway', onPress: () => resolve(true), type: 'warning' },
                        ],
                        onDismiss: () => resolve(false),
                    })
                })
                cancelDecision = undefined
                if (!proceed) {
                    reason = 'cancelled'
                    return
                }
                if (cancelled() || !current()) return
            }
            const loaded = await Llama.useLlamaModelStore.getState().loadKV()
            if (loaded) KV.useKVStore.getState().setKvCacheLoaded(true)
        }
        if (cancelled() || !current()) return
        runtime.abortLocal = async () => {
            reason = 'cancelled'
            await Llama.useLlamaModelStore.getState().stopCompletion()
        }
        updateGeneration(generationId, { status: 'running' })
        await runLocalCompletion(payload, current, generationId, inputs)
        if (!cancelled()) reason = 'completed'
    } catch (error) {
        if (!cancelled()) Logger.errorToast(t('model.toast.failedToRunLocalInference'), error)
    } finally {
        inputs.activateLocalTokenizer()
        runtime.controller.signal.removeEventListener('abort', onAbort)
        await stop(reason)
    }
}

const runLocalCompletion = async (
    payload: NonNullable<Awaited<ReturnType<typeof buildLocalPayload>>>,
    current: () => boolean,
    generationId: number,
    inputs: GenerationInputs
) => {
    enableGenerationInlineReasoning(generationId)
    const thinking = payload as typeof payload & {
        thinking_forced_open?: boolean
        thinking_end_tag?: string
    }
    if (thinking.thinking_forced_open && thinking.thinking_end_tag)
        primeGenerationReasoning(generationId, thinking.thinking_end_tag)
    const filter = createStopFilter(inputs.stopSequence)
    const appendOutput = (cleaned: string) => {
        if (!current() || !cleaned) return
        appendGeneration(generationId, cleaned)
    }
    const outputStream = (text: string) => appendOutput(filter.push(text))
    const outputCompleted = (text: string, timings: CompletionTimings) => {
        if (!current()) return
        updateGeneration(generationId, { timings })
        if (mmkv.getBoolean(AppSettings.PrintContext)) Logger.info(`Completion Output:\n${text}`)
    }
    const engineData = inputs.localConfig
    try {
        await Llama.useLlamaModelStore
            .getState()
            .completion(
                { ...payload, n_threads: engineData.threads },
                outputStream,
                outputCompleted,
                { saveKV: inputs.saveLocalKV }
            )
    } finally {
        appendOutput(filter.flush())
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

const obtainFields = async (inputs: GenerationInputs): Promise<ContextBuilderParams> => ({
    ...(await prepareGenerationContext(inputs)),
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
