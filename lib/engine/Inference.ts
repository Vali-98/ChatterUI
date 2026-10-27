import { t } from 'i18next'

import { ChatSwipe } from '@db/schema'
import { useAppModeStore } from '@lib/state/AppMode'
import { Chats } from '@lib/state/chat'
import { useChatAccessState } from '@lib/state/chat/access'

import { Logger } from '../state/Logger'
import { APIBuilderParams, buildAndSendRequest, CompletionReason } from './API/APIBuilder'
import {
    captureGenerationInputs,
    prepareGenerationContext,
    type GenerationInputs,
} from './generation/inputs'
import { finishGeneration } from './generation/lifecycle'
import { beginGeneration as reserveGeneration, getGenerationRuntime } from './generation/runtime'
import { scheduleDeferredTask } from './generation/scheduler'
import { runGenerationTask } from './generation/service'
import {
    appendGeneration,
    enableGenerationInlineReasoning,
    attachGenerationSwipe,
    isActiveGeneration,
    updateGeneration,
    useGenerationState,
} from './generation/state'
import { localInference } from './LocalInference'

const beginGeneration = (swipeId: number, text = '', reasoning = '') => {
    const context = Chats.db.query.swipeContext(swipeId)
    if (!context) return
    const mode = useAppModeStore.getState().appMode
    const generation = reserveGeneration({
        chatId: context.chat_id,
        swipeId: swipeId,
        mode: mode,
        text: text,
        reasoning: reasoning,
    })
    if (!generation) {
        Logger.infoToast(t('generation.errors.generationAlreadyInProgress'))
        return
    }
    try {
        getGenerationRuntime(generation.id).originalSwipe = Chats.db.query.swipe(swipeId)
        const inputs = captureGenerationInputs(context.chat_id, mode)
        inputs.messages = inputs.messages.map((message) => ({
            ...message,
            swipes: message.swipes.map((swipe) =>
                swipe.id === swipeId
                    ? {
                          ...swipe,
                          swipe: text,
                          reasoning: reasoning
                              ? { swipe_id: swipeId, content: reasoning, reset_length: null }
                              : null,
                      }
                    : swipe
            ),
        }))
        getGenerationRuntime(generation.id).inputs = inputs
    } catch (error) {
        Logger.errorToast(t('generation.errors.failedToOrchestrateRequestBuild'), error)
        void finishGeneration(generation.id, 'failed').catch(Logger.stackTrace)
        return
    }
    return generation.id
}

// Reserve before attachment/database awaits, so repeated UI inputs cannot create competing turns.
export type SubmitMessageInput = { text: string; attachmentUris?: string[] }

export async function submitMessage(chatId: number, input: SubmitMessageInput) {
    const mode = useAppModeStore.getState().appMode
    const generation = reserveGeneration({ chatId: chatId, swipeId: -1, mode: mode, text: '' })
    if (!generation) return false
    try {
        const inputs = captureGenerationInputs(chatId, mode)
        await runGenerationTask(async () => {
            const runtime = getGenerationRuntime(generation.id)
            const message = await Chats.actions.createTurn(
                chatId,
                {
                    userName: inputs.user.name,
                    characterName: inputs.character.name,
                    text: input.text,
                    attachmentUris: input.attachmentUris,
                },
                {
                    signal: runtime.controller.signal,
                    macros: inputs.macros,
                    mutationToken: runtime.mutationToken,
                }
            )
            const swipe = message.swipes.find((item) => item.active)
            if (!swipe) throw new Error('New response has no active swipe')
            attachGenerationSwipe(generation.id, swipe.id)
            inputs.messages =
                Chats.db.live.chat(chatId, { includeReasoning: inputs.includeReasoning }).sync()
                    ?.messages ?? []
            getGenerationRuntime(generation.id).inputs = inputs
            void startGenerationTask(generation.id).catch(Logger.stackTrace)
        })
        return true
    } catch (error) {
        const cancelled = getGenerationRuntime(generation.id).controller.signal.aborted
        if (!cancelled) Logger.errorToast(t('chat.input.errors.failedToSend'), error)
        await finishGeneration(generation.id, cancelled ? 'cancelled' : 'failed').catch(
            Logger.stackTrace
        )
        return false
    }
}

export async function regenerateResponse(swipe: ChatSwipe, regenCache = true) {
    const resetLength = regenCache ? swipe.reset_length : null
    const hasCheckpoint = typeof resetLength === 'number'
    const replacement = hasCheckpoint ? swipe.swipe.slice(0, resetLength) : ''
    const reasoning = Chats.db.query.reasoning(swipe.id)
    const generationId = beginGeneration(
        swipe.id,
        replacement,
        hasCheckpoint ? (reasoning?.content.slice(0, reasoning.reset_length ?? 0) ?? '') : ''
    )
    if (generationId === undefined) return
    try {
        getGenerationRuntime(generationId).swipeChanges = {
            startedAt: new Date(),
            resetTimings: true,
            resetLength: hasCheckpoint ? resetLength : null,
            resetReasoningLength: hasCheckpoint ? (reasoning?.reset_length ?? null) : null,
        }
        await startGenerationTask(generationId)
    } catch (error) {
        Logger.errorToast(t('generation.errors.completionFailed'), error)
        await finishGeneration(generationId, 'failed')
    }
}

export async function continueResponse(swipe: ChatSwipe) {
    const reasoning = Chats.db.query.reasoning(swipe.id)?.content ?? ''
    const generationId = beginGeneration(swipe.id, swipe.swipe, reasoning)
    if (generationId === undefined) return
    try {
        getGenerationRuntime(generationId).swipeChanges = {
            resetLength: swipe.swipe.length,
            resetReasoningLength: reasoning.length,
        }
        await startGenerationTask(generationId)
    } catch (error) {
        Logger.errorToast(t('generation.errors.completionFailed'), error)
        await finishGeneration(generationId, 'failed')
    }
}

export async function generateResponse(swipeId: number) {
    const generationId = beginGeneration(swipeId)
    if (generationId !== undefined) await startGenerationTask(generationId)
}

const startGenerationTask = async (generationId: number) => {
    if (!isGenerationActive(generationId)) return
    const inputs = getGenerationRuntime(generationId).inputs
    if (!inputs) return
    try {
        await runGenerationTask(async () => {
            try {
                if (inputs.mode === 'local') await localInference(generationId, inputs)
                else await chatInferenceStream(generationId, inputs)
            } catch (error) {
                Logger.errorToast(t('generation.errors.completionFailed'), error)
                await finishGeneration(generationId, 'failed').catch(Logger.stackTrace)
            }
        })
    } catch (error) {
        Logger.errorToast(t('generation.errors.completionFailed'), error)
        await finishGeneration(generationId, 'failed')
    }
}

const isGenerationActive = (generationId: number) => {
    const generation = useGenerationState.getState().generations[generationId]
    return !!generation && isActiveGeneration(generation)
}

async function chatInferenceStream(generationId: number, inputs: GenerationInputs) {
    if (!isGenerationActive(generationId)) return
    const { chatId } = inputs
    const stop = async (reason: CompletionReason) => {
        const output = useGenerationState.getState().generations[generationId]
        const titleInputs = {
            ...inputs,
            messages: inputs.messages.map((message) => ({
                ...message,
                swipes: message.swipes.map((swipe) =>
                    swipe.id === output?.swipeId ? { ...swipe, swipe: output.text } : swipe
                ),
            })),
        }
        await finishGeneration(generationId, reason)
        if (
            reason === 'completed' &&
            output?.receivedOutput &&
            output.text.trim() &&
            !controller.signal.aborted &&
            inputs.autoTitle &&
            Chats.db.query.chatName(chatId) === 'New Chat'
        ) {
            scheduleDeferredTask(chatId, (signal) => titleGeneratorStream(titleInputs, signal), {
                mode: 'remote',
                kind: 'title',
            })
        }
    }
    const onData: APIBuilderParams['onData'] = (output) => {
        if (!isGenerationActive(generationId) || output.type === 'tool_call') return
        appendGeneration(generationId, output.content, output.type)
    }

    const { controller } = getGenerationRuntime(generationId)
    const { ready } = obtainFields(inputs, {
        controller: controller,
        onData: onData,
        stopGenerating: stop,
    })
    const fields = await ready
    if (controller.signal.aborted || !isGenerationActive(generationId)) {
        await stop('cancelled')
        return
    }
    if (!fields) {
        Logger.error('Chat Inference Failed')
        await stop('failed')
        return
    }
    if (
        fields.apiConfig.request.completionType.type === 'textCompletions' ||
        !fields.apiConfig.request.reasoningParsePattern?.length
    )
        enableGenerationInlineReasoning(generationId)
    updateGeneration(generationId, { status: 'running' })
    const request = buildAndSendRequest(fields)
    await request.done
}

const titleGeneratorStream = async (inputs: GenerationInputs, signal: AbortSignal) => {
    const { chatId } = inputs
    if (Chats.db.query.chatName(chatId) !== 'New Chat') return
    let titleOutput = ''
    const completion: { reason: CompletionReason } = { reason: 'failed' }
    const { ready } = obtainFields(
        {
            ...inputs,
            samplers: {
                ...inputs.samplers,
                genamt: 50,
                reasoning_max_tokens: 0,
                reasoning_effort: 'low',
                reasoning_exclude: true,
            },
        },
        {
            signal: signal,
            recordStats: false,
            stopGenerating: (reason) => {
                completion.reason = reason
            },
            onData: (output) => {
                if (output.type === 'text') titleOutput += output.content
            },
            onEnd: () => {
                const title = titleOutput
                    .trim()
                    .replace(/["'.*]/g, '')
                    .replace(/\b\w/g, (char) => char.toUpperCase())
                    .trim()
                if (!title) throw new Error('Generated title was blank')
                Logger.debug('Autogenerated Name: ' + title)
                if (
                    Chats.db.query.chatName(chatId) === 'New Chat' &&
                    !useChatAccessState.getState().leases[chatId]
                )
                    Chats.db.update.chat(chatId, { name: title })
            },
        }
    )
    const fields = await ready
    if (!fields) {
        throw new Error('Title preparation failed')
    }
    const entry = {
        id: -1,
        chat_id: -1,
        name: '',
        is_user: true,
        order: 0,
        swipe_id: 0,
        swipes: [
            {
                id: -1,
                entry_id: -1,
                swipe: 'Generate a short 2-4 word title for this chat. Only Respond with the title and nothing else.',
                send_date: new Date(),
                gen_started: new Date(),
                gen_finished: new Date(),
                timings: null,
                active: true,
                token_length: null,
                reset_length: null,
            },
        ],
        attachments: [],
    }
    fields.messages.push(entry)

    const request = buildAndSendRequest(fields)
    await request.done
    if (completion.reason !== 'completed') throw new Error(`Title generation ${completion.reason}`)
}

type ObtainFieldsOptions = Pick<APIBuilderParams, 'onData' | 'onEnd' | 'stopGenerating'> & {
    controller?: AbortController
    signal?: AbortSignal
    recordStats?: boolean
}

function obtainFields(inputs: GenerationInputs, options: ObtainFieldsOptions) {
    const {
        controller = new AbortController(),
        signal = controller.signal,
        recordStats = true,
        ...handlers
    } = options
    const ready = (async (): Promise<APIBuilderParams | void> => {
        try {
            const apiConfig = inputs.apiConfig
            const apiValues = inputs.apiValues
            if (!apiConfig || !apiValues) return
            const samplers = { ...inputs.samplers }
            const modelLengthField = apiConfig.model.contextSizeParser
                .split('.')
                .reduce((value, key) => value?.[key], apiValues.model)
            const instructLength = samplers.max_length
            const modelLength = Number.isInteger(modelLengthField)
                ? modelLengthField
                : instructLength
            const length = Math.max(
                0,
                (apiConfig.model.useModelContextLength
                    ? Math.min(modelLength, instructLength)
                    : instructLength) - samplers.genamt
            )
            const limit = apiConfig.request.stopSequenceLimit
            const context = await prepareGenerationContext(inputs, { recordStats })
            return {
                ...context,
                ...handlers,
                signal: signal,
                apiConfig: apiConfig,
                apiValues: apiValues,
                samplers: samplers,
                stopSequence: limit
                    ? inputs.stopSequence.slice(0, limit)
                    : [...inputs.stopSequence],
                maxLength: length,
            }
        } catch (error) {
            Logger.errorToast(t('generation.errors.failedToOrchestrateRequestBuild'), error)
        }
    })()
    return { controller, ready }
}
