import { useAppModeState } from '@lib/state/AppMode'
import { Chats, useInference } from '@lib/state/Chat'
import BackgroundService from 'react-native-background-actions'

import { Characters } from '../state/Characters'
import { Logger } from '../state/Logger'
import { buildAndSendRequest } from './API/APIBuilder'
import { localInference } from './LocalInference'

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
    const data = performance.now()
    const appMode = useAppModeState.getState().appMode

    if (appMode === 'local') {
        await BackgroundService.start(localInference, completionTaskOptions)
    } else {
        await BackgroundService.start(buildAndSendRequest, completionTaskOptions)
    }

    Logger.debug(`Time taken for generateResponse(): ${(performance.now() - data).toFixed(2)}ms`)
}
