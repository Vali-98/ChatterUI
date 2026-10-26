import { JinjaFormattedChatResult } from 'cui-llama.rn'
import { t } from 'i18next'

import Alert from '@components/views/Alert'
import { CompletionTimings } from '@db/schema'
import { AppSettings } from '@lib/constants/GlobalValues'
import { SamplerConfigData, SamplerID, Samplers } from '@lib/constants/SamplerData'
import { isCloseThinkTag, isOpenThinkTag } from '@lib/markdown/ThinkTags'
import { Characters } from '@lib/state/characters'
import { CharacterLinks } from '@lib/state/characters/links'
import { useCharacterTokenState } from '@lib/state/characters/tokenState'
import { Chats, useGenerationState } from '@lib/state/chat'
import { commonStopStrings, Instructs, outputPrefixes } from '@lib/state/Instructs'
import { Logger } from '@lib/state/Logger'
import { getCurrentSampler } from '@lib/state/samplerStore'
import { useTTSStore } from '@lib/state/TTS'
import { mmkv } from '@lib/storage/MMKV'

import type { CompletionReason } from './API/APIBuilder'
import { APIConfiguration, APISampler, APIValues } from './API/APIBuilder.types'
import {
    buildChatCompletionContext,
    buildTextCompletionContext,
    ContextBuilderParams,
} from './API/ContextBuilder'
import { getDataSources } from './DataSources'
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

const getSamplerFields = (max_length?: number) => {
    const preset: SamplerConfigData = getCurrentSampler()
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

const buildLocalPayload = async (chatId?: number) => {
    const payloadFields = getSamplerFields()
    const rep_pen = payloadFields?.['penalty_repeat']
    const reasoning = payloadFields?.['enable_thinking'] as boolean
    let thinkTags = {}
    const localPreset: LlamaConfig = Llama.useLlamaPreferencesStore.getState().config
    let prompt: undefined | string = undefined
    let mediaPaths: string[] = []
    const context = Llama.useLlamaModelStore.getState().context

    const fields = await obtainFields(chatId)

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
    const bufferExists = !!Chats.useChatState.getState().buffer.data

    if (mmkv.getBoolean(AppSettings.UseModelTemplate)) {
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
        stop: constructStopSequence(),
        emit_partial_completion: true,
        ...finalMediaPaths,
        ...thinkTags,
    }
}

const constructStopSequence = (): string[] => {
    // kept this helper for extendability
    return Instructs.useInstruct.getState().getStopSequence()
}

const constructReplaceStrings = (): string[] => {
    // default stop strings defined instructs
    const stops: string[] = constructStopSequence()
    // additional stop strings based on context configuration
    //    const output: string[] = []
    //  return [...stops, ...output]
    return stops
}

const maybeLoadLinkedModel = async () => {
    const characterId = Characters.useCharacterState.getState().id
    if (!characterId) return false
    const links = await CharacterLinks.db.query.links(characterId)
    const modelLink = links.find((link) => link.type === 'model_id')
    if (!modelLink) return false
    const model = await Model.getModelWithMMProj(modelLink.value)
    if (!model) return false
    Logger.infoToast(t('model.toast.autoLoadingModel', { name: model.name }))
    await Llama.useLlamaModelStore.getState().load(model)
    return true
}

const verifyModelLoaded = async (): Promise<boolean> => {
    const model = Llama.useLlamaModelStore.getState().model

    // Model Loading Routine, also check for character linked model
    if (model || (await maybeLoadLinkedModel())) return true

    const lastModel = Llama.useLlamaPreferencesStore.getState().lastModel
    const autoLoad = mmkv.getBoolean(AppSettings.AutoLoadLocal)

    // If  autoload is disabled, just return
    if (!autoLoad || !lastModel) {
        Logger.warnToast(
            !autoLoad ? t('model.toast.noModelLoaded') : t('model.toast.noAutoLoadModelSet')
        )
        return false
    }

    // attempt to load model
    Logger.infoToast(t('model.toast.autoLoadingModel', { name: lastModel.name }))
    await Llama.useLlamaModelStore.getState().load(lastModel)

    return true
}

export const localInference = async (generationId = useGenerationState.getState().generationId) => {
    let reason: CompletionReason = 'failed'
    const cancelled = () => reason === 'cancelled'
    let cancelDecision: (() => void) | undefined
    const current = () => {
        const state = useGenerationState.getState()
        return state.isGenerating && state.generationId === generationId
    }
    if (!current()) return
    const swipeId = useGenerationState.getState().currentSwipeId
    const chatId = swipeId === undefined ? undefined : Chats.db.query.swipeContext(swipeId)?.chat_id
    const stop = (reason: CompletionReason) =>
        Chats.actions.finishGeneration({
            generationId: generationId,
            notify: reason === 'completed',
        })
    useGenerationState.getState().setAbort(() => {
        reason = 'cancelled'
        cancelDecision?.()
    })
    try {
        if (!(await verifyModelLoaded()) || cancelled() || !current()) return
        const context = Llama.useLlamaModelStore.getState().context
        if (!context) {
            Logger.warnToast(t('model.toast.noModelLoaded'))
            return
        }
        const payload = await buildLocalPayload(chatId)
        if (cancelled() || !current()) return
        if (!payload) {
            Logger.warnToast(t('generation.errors.failedToBuildPayload'))
            return
        }
        if (mmkv.getBoolean(AppSettings.SaveLocalKV) && !KV.useKVStore.getState().kvCacheLoaded) {
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
        useGenerationState.getState().setAbort(async () => {
            reason = 'cancelled'
            await Llama.useLlamaModelStore.getState().stopCompletion()
        })
        await runLocalCompletion(payload, current)
        if (!cancelled()) reason = 'completed'
    } catch (error) {
        if (!cancelled()) Logger.errorToast(t('model.toast.failedToRunLocalInference'), error)
    } finally {
        await stop(reason)
    }
}

const runLocalCompletion = async (
    payload: NonNullable<Awaited<ReturnType<typeof buildLocalPayload>>>,
    current: () => boolean
) => {
    const filter = createStopFilter(constructReplaceStrings())
    let reasoningMode = false
    const appendOutput = (cleaned: string) => {
        if (!current() || !cleaned) return
        Chats.useChatState.getState().insertToBuffer(cleaned)
        if (reasoningMode) {
            if (isCloseThinkTag(cleaned)) reasoningMode = false
            return
        }
        if (isOpenThinkTag(cleaned)) {
            reasoningMode = !isCloseThinkTag(cleaned)
            return
        }
        useTTSStore.getState().insertBuffer(cleaned)
    }
    const outputStream = (text: string) => appendOutput(filter.push(text))
    const outputCompleted = (text: string, timings: CompletionTimings) => {
        if (!current()) return
        Chats.useChatState.getState().setBufferTimings(timings)
        if (mmkv.getBoolean(AppSettings.PrintContext)) Logger.info(`Completion Output:\n${text}`)
    }
    const engineData = Llama.useLlamaPreferencesStore.getState().config
    try {
        await Llama.useLlamaModelStore
            .getState()
            .completion(
                { ...payload, n_threads: engineData.threads },
                outputStream,
                outputCompleted
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

// This is the 'big orchestrator' which compiles fields from
// the whole app to send inference requests
const obtainFields = async (targetChatId?: number): Promise<ContextBuilderParams | void> => {
    try {
        const userState = Characters.useUserStore.getState()
        const characterState = Characters.useCharacterState.getState()

        const instructState = Instructs.useInstruct.getState()

        const userCard = userState.card
        if (!userCard) {
            Logger.errorToast(t('generation.errors.noUser'))
            return
        }

        const characterCard =
            targetChatId === undefined
                ? characterState.card
                : await Characters.db.query.card(
                      Chats.db.query.chatRow(targetChatId)?.character_id ?? -1
                  )
        if (!characterCard) {
            Logger.errorToast(t('generation.errors.noCharacter'))
            return
        }
        const chatId = targetChatId ?? Chats.useChatState.getState().id
        if (!chatId) {
            Logger.errorToast(t('generation.errors.noActiveChat'))
            return
        }

        const messages = (await Chats.db.query.chat(chatId))?.messages
        if (!messages) {
            Logger.errorToast(t('generation.errors.noChatFound'))
            return
        }

        const apiValues = localAPIValues
        if (!apiValues) {
            Logger.warnToast(t('generation.errors.noActiveAPI'))
            return
        }

        const apiConfig = localAPIConfig
        if (!apiConfig) {
            Logger.errorToast(
                t('generation.errors.configurationNotFound', { name: apiValues?.configName })
            )
            return
        }

        const engineData = Llama.useLlamaPreferencesStore.getState().config
        const samplers = getCurrentSampler()

        const instructLength = engineData.context_length
        const length = Math.max(instructLength - samplers.genamt, 0)

        const tokenCounts = await useCharacterTokenState
            .getState()
            .countTokens(characterCard, userCard)

        return {
            apiConfig: {
                ...apiConfig,
                request: {
                    ...apiConfig.request,
                    completionType: { ...apiConfig.request.completionType },
                },
            },
            apiValues: Object.assign({}, apiValues),

            instruct: instructState.replacedMacros(),
            character: Object.assign({}, characterCard),
            user: Object.assign({}, userCard),
            messages: [...messages],
            chatTokenizer: (message) =>
                Chats.actions.countMessageTokens(
                    message,
                    Llama.useLlamaModelStore.getState().tokenLength
                ),
            tokenizer: Llama.useLlamaModelStore.getState().tokenLength,
            maxLength: length,
            dataSources: await getDataSources(chatId),
            cache: {
                ...tokenCounts,
                instructCache: await instructState.getCache(characterCard.name, userCard.name),
            },
        }
    } catch (e) {
        Logger.errorToast(t('generation.errors.failedToOrchestrateRequestBuild'), e)
    }
}
