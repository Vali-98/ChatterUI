import { t } from 'i18next'
import BackgroundService from 'react-native-background-actions'

import { ChatSwipe } from '@db/schema'
import { AppSettings } from '@lib/constants/GlobalValues'
import { isCloseThinkTag, isOpenThinkTag } from '@lib/markdown/ThinkTags'
import { useAppModeStore } from '@lib/state/AppMode'
import { useCharacterTokenState } from '@lib/state/characters/tokenState'
import { Chats, useGenerationState } from '@lib/state/chat'
import { Instructs } from '@lib/state/Instructs'
import { getCurrentSampler } from '@lib/state/samplerStore'
import { useTTSStore } from '@lib/state/TTS'
import { mmkv } from '@lib/storage/MMKV'

import { Characters } from '../state/characters'
import { Logger } from '../state/Logger'
import { APIBuilderParams, buildAndSendRequest, CompletionReason } from './API/APIBuilder'
import { APIConfiguration, APIValues } from './API/APIBuilder.types'
import { useConnectionStore } from './API/connectionStore'
import { getDataSources } from './DataSources'
import { localInference } from './LocalInference'
import { Tokenizer } from './Tokenizer'

const beginGeneration = (swipeId: number, text = '') => {
    if (useGenerationState.getState().isGenerating) {
        Logger.infoToast(t('generation.errors.generationAlreadyInProgress'))
        return undefined
    }
    useGenerationState.getState().startGenerating(swipeId)
    Chats.useChatState.getState().setBuffer({ data: text })
    return useGenerationState.getState().generationId
}

export async function regenerateResponse(swipe: ChatSwipe, regenCache = true) {
    const replacement =
        regenCache && swipe.reset_length ? swipe.swipe.slice(0, swipe.reset_length) : ''
    const generationId = beginGeneration(swipe.id, replacement)
    if (generationId === undefined) return
    try {
        await Chats.actions.updateSwipe(swipe.id, replacement, {
            updateFinished: true,
            updateStarted: true,
            resetTimings: true,
        })
        await startGenerationTask(generationId)
    } catch (error) {
        Logger.errorToast(t('generation.errors.completionFailed'), error)
        await Chats.actions.finishGeneration({ generationId: generationId, notify: false })
    }
}

export async function continueResponse(swipe: ChatSwipe) {
    const generationId = beginGeneration(swipe.id, swipe.swipe)
    if (generationId === undefined) return
    try {
        Chats.db.update.swipe(swipe.id, { reset_length: swipe.swipe.length })
        await startGenerationTask(generationId)
    } catch (error) {
        Logger.errorToast(t('generation.errors.completionFailed'), error)
        await Chats.actions.finishGeneration({ generationId: generationId, notify: false })
    }
}

const completionTaskOptions = {
    taskName: 'chatterui_completion_task',
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

export async function generateResponse(swipeId: number) {
    const generationId = beginGeneration(swipeId)
    if (generationId !== undefined) await startGenerationTask(generationId)
}

const startGenerationTask = async (generationId: number) => {
    if (!isCurrentGeneration(generationId)) return
    const appMode = useAppModeStore.getState().appMode
    try {
        await BackgroundService.start(async () => {
            try {
                if (appMode === 'local') await localInference(generationId)
                else await chatInferenceStream(generationId)
            } catch (error) {
                Logger.errorToast(t('generation.errors.completionFailed'), error)
                await Chats.actions
                    .finishGeneration({ generationId: generationId, notify: false })
                    .catch(Logger.stackTrace)
            }
        }, completionTaskOptions)
    } catch (error) {
        Logger.errorToast(t('generation.errors.completionFailed'), error)
        await Chats.actions.finishGeneration({ generationId: generationId, notify: false })
    }
}

const isCurrentGeneration = (generationId: number) => {
    const state = useGenerationState.getState()
    return state.isGenerating && state.generationId === generationId
}

async function chatInferenceStream(generationId: number) {
    if (!isCurrentGeneration(generationId)) return
    const swipeId = useGenerationState.getState().currentSwipeId
    const chatId = swipeId === undefined ? undefined : Chats.db.query.swipeContext(swipeId)?.chat_id
    const stop = (reason: CompletionReason) =>
        Chats.actions.finishGeneration({
            generationId: generationId,
            notify: reason === 'completed',
            onSaved:
                reason === 'completed' && chatId !== undefined
                    ? async () => {
                          if (
                              !mmkv.getBoolean(AppSettings.AutoGenerateTitle) ||
                              Chats.db.query.chatName(chatId) !== 'New Chat'
                          )
                              return
                          await titleGeneratorStream(chatId, controller)
                      }
                    : undefined,
        })
    let reasoningMode: 'structured' | 'raw' | null = null
    const onData: APIBuilderParams['onData'] = (output) => {
        if (!isCurrentGeneration(generationId)) return
        let suppressTTS = output.type === 'reasoning'
        if (!reasoningMode && output.type === 'reasoning') {
            Chats.useChatState.getState().insertToBuffer('<think>')
            reasoningMode = 'raw'
        }

        if (reasoningMode === 'raw' && output.type !== 'reasoning' && reasoningMode === 'raw') {
            Chats.useChatState.getState().insertToBuffer('</think>\n')
            reasoningMode = null
        }

        /**
         * This is a naive implementation that expects output tags to be full tokens
         * Most LLMs are trained so that think_start and think_end tokens are not composite
         */
        if (!reasoningMode && output.type === 'text' && isOpenThinkTag(output.content)) {
            reasoningMode = 'structured'
        }

        if (reasoningMode === 'structured') suppressTTS = true
        if (
            reasoningMode === 'structured' &&
            output.type === 'text' &&
            isCloseThinkTag(output.content)
        ) {
            reasoningMode = null
        }

        Chats.useChatState.getState().insertToBuffer(output.content)

        /**
         * considerations
         * - add tool calls
         */
        if (!reasoningMode && !suppressTTS) useTTSStore.getState().insertBuffer(output.content)
    }

    const { controller, ready } = obtainFields(chatId, { onData: onData, stopGenerating: stop })
    useGenerationState.getState().setAbort(() => controller.abort())
    const fields = await ready
    if (controller.signal.aborted || !isCurrentGeneration(generationId)) {
        await stop('cancelled')
        return
    }
    if (!fields) {
        Logger.error('Chat Inference Failed')
        await stop('failed')
        return
    }
    const request = buildAndSendRequest(fields)
    await request.done
}

const titleGeneratorStream = async (chatId: number, controller: AbortController) => {
    let titleOutput = ''
    const { ready } = obtainFields(chatId, {
        controller: controller,
        onData: (output) => {
            if (output.type === 'text') titleOutput += output.content
        },
        onEnd: () => {
            Logger.debug('Autogenerated Name: ' + titleOutput)
            if (titleOutput)
                Chats.db.update.chat(chatId, {
                    name: titleOutput
                        .trim()
                        .replace(/["'.*]/g, '')
                        .replace(/\b\w/g, (char) => char.toUpperCase()),
                })
            else Logger.warn('Autogenerated name was blank.')
        },
    })
    const fields = await ready
    if (!fields) {
        Logger.error('Title Generation Failed')
        return
    }
    fields.samplers.genamt = 50
    fields.samplers.reasoning_max_tokens = 0
    fields.samplers.reasoning_effort = 'low'
    fields.samplers.reasoning_exclude = true
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
}

const getModelContextLength = (config: APIConfiguration, values: APIValues): number | undefined => {
    const keys = config.model.contextSizeParser.split('.')
    const result = keys.reduce((acc, key) => acc?.[key], values.model)
    return Number.isInteger(result) ? result : undefined
}

// This is the 'big orchestrator' which compiles fields from
// the whole app to send inference requests
type ObtainFieldsOptions = Pick<APIBuilderParams, 'onData' | 'onEnd' | 'stopGenerating'> & {
    controller?: AbortController
}

function obtainFields(targetChatId: number | undefined, options: ObtainFieldsOptions) {
    const { controller = new AbortController(), ...handlers } = options
    const ready = (async (): Promise<APIBuilderParams | void> => {
        try {
            const userState = Characters.useUserStore.getState()
            const characterState = Characters.useCharacterState.getState()
            const apiState = useConnectionStore.getState()
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

            const apiValues = apiState.connections.find(
                (item) => item.id === apiState.activeConnectionId
            )
            if (!apiValues) {
                Logger.warnToast(t('generation.errors.noActiveAPI'))
                return
            }

            const configs = apiState
                .getTemplates()
                .filter((item) => item.name === apiValues.configName)

            const apiConfig = configs[0]
            if (!apiConfig) {
                Logger.errorToast(
                    t('generation.errors.configurationNotFound', { name: apiValues?.configName })
                )
                return
            }
            const samplers = getCurrentSampler()
            const modelLengthField = getModelContextLength(apiConfig, apiValues)
            const instructLength = samplers.max_length as number
            const modelLength = modelLengthField ?? (instructLength as number)
            const length = Math.max(
                0,
                (apiConfig.model.useModelContextLength
                    ? Math.min(modelLength, instructLength)
                    : instructLength) - (samplers.genamt as number)
            )

            let stopSequence = instructState.getStopSequence()
            const stopSequenceLimit = apiConfig.request.stopSequenceLimit
            if (stopSequenceLimit && stopSequence?.length > stopSequenceLimit) {
                stopSequence = stopSequence.slice(0, stopSequenceLimit)
                Logger.warn('Stop sequence length exceeds defined stopSequenceLimit')
            }
            const tokenizer = Tokenizer.getTokenizer()

            const dataSources = await getDataSources(chatId)

            const tokenCounts = await useCharacterTokenState
                .getState()
                .countTokens(characterCard, userCard)

            return {
                ...handlers,
                signal: controller.signal,
                apiConfig: Object.assign({}, apiConfig),
                apiValues: Object.assign({}, apiValues),
                instruct: instructState.replacedMacros(),
                samplers: Object.assign({}, samplers),
                character: Object.assign({}, characterCard),
                user: Object.assign({}, userCard),
                messages: [...messages],
                stopSequence: stopSequence,
                chatTokenizer: (message) => Chats.actions.countMessageTokens(message, tokenizer),
                tokenizer: tokenizer,
                maxLength: length,
                cache: {
                    ...tokenCounts,
                    instructCache: await instructState.getCache(characterCard.name, userCard.name),
                },
                dataSources: dataSources,
            }
        } catch (e) {
            Logger.stackTrace(e)
            Logger.errorToast(t('generation.errors.failedToOrchestrateRequestBuild'), e)
        }
    })()
    return { controller: controller, ready: ready }
}
