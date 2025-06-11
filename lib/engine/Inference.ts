import { useAppModeState } from '@lib/state/AppMode'
import { Chats, useInference } from '@lib/state/Chat'
import BackgroundService from 'react-native-background-actions'

import { Instructs } from '@lib/state/Instructs'
import { SamplersManager } from '@lib/state/SamplerState'
import { useTTSState } from '@lib/state/TTS'
import { useCallback } from 'react'
import { Characters } from '../state/Characters'
import { Logger } from '../state/Logger'
import { APIBuilderParams, buildAndSendRequest } from './API/APIBuilder'
import { APIConfiguration, APIValues } from './API/APIBuilder.types'
import { APIState } from './API/APIManagerState'
import { localInference } from './LocalInference'
import { Tokenizer } from './Tokenizer'

export const regenerateResponse = async (swipeId: number, regenCache: boolean = true) => {
    const charName = Characters.useCharacterCard.getState().card?.name
    const messagesLength = Chats.useChatState.getState()?.data?.messages?.length ?? -1
    const message = Chats.useChatState.getState()?.data?.messages?.[messagesLength - 1]

    Logger.info('Regenerate Response' + (regenCache ? '' : ' , Resetting Message'))

    if (message?.is_user) {
        await Chats.useChatState.getState().addEntry(charName ?? '', true, '')
    } else if (messagesLength && messagesLength !== 1) {
        let replacement = ''

        if (regenCache) replacement = message?.swipes[message.swipe_id].regen_cache ?? ''
        else Chats.useChatState.getState().resetRegenCache()

        if (replacement) Chats.useChatState.getState().setBuffer({ data: replacement })
        await Chats.useChatState.getState().updateEntry(messagesLength - 1, replacement, {
            updateFinished: true,
            updateStarted: true,
            resetTimings: true,
        })
    }
    await generateResponse(swipeId)
}

export const continueResponse = async (swipeId: number) => {
    Logger.info(`Continuing Response`)
    Chats.useChatState.getState().setRegenCache()
    Chats.useChatState.getState().insertLastToBuffer()
    await generateResponse(swipeId)
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

export const generateResponse = async (swipeId: number) => {
    if (useInference.getState().nowGenerating) {
        Logger.infoToast('Generation already in progress')
        return
    }
    Chats.useChatState.getState().startGenerating(swipeId)
    Logger.info(`Obtaining response.`)
    const appMode = useAppModeState.getState().appMode

    if (appMode === 'local') {
        await BackgroundService.start(localInference, completionTaskOptions)
    } else {
        await BackgroundService.start(chatInferenceStream, completionTaskOptions)
    }
}
// TODO: Use this
const useGenerateResponse = () => {
    const startGenerating = Chats.useChatState((state) => state.startGenerating)
    const nowGenerating = useInference((state) => state.nowGenerating)
    const appMode = useAppModeState((state) => state.appMode)

    const generateResponse = useCallback(
        async (swipeId: number) => {
            if (nowGenerating) {
                Logger.infoToast('Generation already in progress')
                return
            }
            startGenerating(swipeId)
            Logger.info(`Obtaining response.`)
            const process = appMode === 'local' ? localInference : chatInferenceStream
            await BackgroundService.start(process, completionTaskOptions)
        },
        [nowGenerating, appMode]
    )

    return generateResponse
}

const chatInferenceStream = async () => {
    const fields = await obtainFields()
    const stop = () => Chats.useChatState.getState().stopGenerating()
    if (!fields) {
        Logger.error('Chat Inference Failed')
        stop()
        return
    }
    fields.stopGenerating = stop
    fields.onData = (text) => {
        Chats.useChatState.getState().insertBuffer(text)
        useTTSState.getState().insertBuffer(text)
    }
    fields.onEnd = () => {
        // TODO: Generate title if valid
    }
    const abort = await buildAndSendRequest(fields)
    useInference.getState().setAbort(() => {
        Logger.debug('Running Abort')
        if (abort) abort()
    })
}

const titleGeneratorStream = async () => {
    const fields = await obtainFields()
    if (!fields) {
        Logger.error('Title Generation Failed')
        return
    }
    let output = ''
    fields.onData = (text) => {
        output += text
    }
    fields.onEnd = () => {
        console.log(output)
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
            },
        ],
        attachments: [],
    }
    fields.messages.push(entry)
    fields.stopGenerating = () => Chats.useChatState.getState().stopGenerating()

    await buildAndSendRequest(fields)
}

const getModelContextLength = (config: APIConfiguration, values: APIValues): number | undefined => {
    const keys = config.model.contextSizeParser.split('.')
    const result = keys.reduce((acc, key) => acc?.[key], values.model)
    return Number.isInteger(result) ? result : undefined
}

// This is the 'big orchestrator' which compiles fields from
// the whole app to send inference requests
const obtainFields = async (): Promise<APIBuilderParams | void> => {
    try {
        const userState = Characters.useUserCard.getState()
        const characterState = Characters.useCharacterCard.getState()
        const chatState = Chats.useChatState.getState()
        const apiState = APIState.useAPIState.getState()
        const instructState = Instructs.useInstruct.getState()

        const userCard = userState.card
        if (!userCard) {
            Logger.errorToast('No loaded user')
            return
        }

        const characterCard = characterState.card
        if (!characterCard) {
            Logger.errorToast('No loaded character')
            return
        }
        const messages = chatState.data?.messages
        if (!messages) {
            Logger.errorToast('No chat character')
            return
        }

        const apiValues = apiState.values.find((item, index) => index === apiState.activeIndex)
        if (!apiValues) {
            Logger.warnToast(`No Active API`)
            return
        }

        const configs = apiState.getTemplates().filter((item) => item.name === apiValues.configName)

        const apiConfig = configs[0]
        if (!apiConfig) {
            Logger.errorToast(`Configuration "${apiValues?.configName}" not found`)
            return
        }
        const samplers = SamplersManager.getCurrentSampler()
        const modelLengthField = getModelContextLength(apiConfig, apiValues)
        const instructLength = samplers.max_length as number
        const modelLength = modelLengthField ?? (instructLength as number)
        const length = apiConfig.model.useModelContextLength
            ? Math.min(modelLength, instructLength)
            : instructLength - (samplers.genamt as number)

        return {
            apiConfig: apiConfig,
            apiValues: apiValues,
            onData: () => {},
            onEnd: () => {},
            instruct: instructState.replacedMacros(),
            samplers: samplers,
            character: characterCard,
            user: userCard,
            messages: [...messages],
            stopSequence: instructState.getStopSequence(),
            stopGenerating: () => {},
            chatTokenizer: async (entry, index) => {
                // IMPORTANT - we use -1 for dummy entries
                if (entry.id === -1) return 0
                return await chatState.getTokenCount(index)
            },
            tokenizer: Tokenizer.getTokenizer(),
            maxLength: length,
            cache: {
                userCache: await characterState.getCache(characterCard.name),
                characterCache: await userState.getCache(userCard.name),
                instructCache: await instructState.getCache(characterCard.name, userCard.name),
            },
        }
    } catch (e) {
        Logger.errorToast('Failed to orchestrate request build: ' + e)
    }
}
