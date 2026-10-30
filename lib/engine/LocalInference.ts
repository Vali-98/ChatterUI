import { t } from 'i18next'

import Alert from '@components/views/Alert'
import { CompletionTimings } from '@db/schema'
import { AppSettings } from '@lib/constants/GlobalValues'
import { Logger } from '@lib/state/Logger'
import { mmkv } from '@lib/storage/MMKV'

import type { CompletionReason } from './API/APIBuilder'
import { type GenerationInputs } from './generation/inputs'
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
import { Llama } from './Local/LlamaLocal'
import { KV, Model } from './Local/Model'
import { buildLocalPayload } from './Local/payload'
import { createStopFilter } from './stopSequenceFilter'
export { localSamplerData } from './Local/payload'

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
    Logger.info(t('model.toast.autoLoadingModel', { name: model.name }))
    await Llama.useLlamaModelStore
        .getState()
        .load(model, { generationId: generationId, config: inputs.localConfig })
    return true
}

export const verifyModelLoaded = async (
    inputs: GenerationInputs,
    generationId: number
): Promise<boolean> => {
    const model = Llama.useLlamaModelStore.getState().model
    if (inputs.localModel && inputs.localModel.id !== model?.id)
        throw new Error('Local model changed before generation execution')

    // Model Loading Routine, also check for character linked model
    if (model) return true
    if (await maybeLoadLinkedModel(inputs.character.id, generationId, inputs))
        return !!Llama.useLlamaModelStore.getState().context

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
    Logger.info(t('model.toast.autoLoadingModel', { name: lastModel.name }))
    await Llama.useLlamaModelStore
        .getState()
        .load(lastModel, { generationId: generationId, config: inputs.localConfig })

    return !!Llama.useLlamaModelStore.getState().context
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
        const payload = await buildLocalPayload(inputs, { continuing: !!generation.text })
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
