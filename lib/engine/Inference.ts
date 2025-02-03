import { Chats, useInference } from '@lib/state/Chat'
import BackgroundService from 'react-native-background-actions'

import { AppMode, Global } from '../constants/GlobalValues'
import { Characters } from '../state/Characters'
import { Logger } from '../state/Logger'
import { mmkv } from '../storage/MMKV'
import { buildAndSendRequest } from './API/APIBuilder'
import { localInference } from './LocalInference'

export const regenerateResponse = async (swipeId: number, regenCache: boolean = true) => {
    const charName = Characters.useCharacterCard.getState().card?.name
    const messagesLength = Chats.useChatState.getState()?.data?.messages?.length ?? -1
    const message = Chats.useChatState.getState()?.data?.messages?.[messagesLength - 1]

    Logger.log('Regenerate Response' + (regenCache ? '' : ' , Resetting Message'))

    if (message?.is_user) {
        await Chats.useChatState.getState().addEntry(charName ?? '', true, '')
    } else if (messagesLength && messagesLength !== 1) {
        let replacement = ''

        if (regenCache) replacement = message?.swipes[message.swipe_id].regen_cache ?? ''
        else Chats.useChatState.getState().resetRegenCache()

        if (replacement) Chats.useChatState.getState().setBuffer(replacement)
        await Chats.useChatState.getState().updateEntry(messagesLength - 1, replacement, true, true)
    }
    await generateResponse(swipeId)
}

export const continueResponse = async (swipeId: number) => {
    Logger.log(`Continuing Response`)
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
        Logger.log('Generation already in progress', true)
        return
    }
    Chats.useChatState.getState().startGenerating(swipeId)
    Logger.log(`Obtaining response.`)
    const data = performance.now()
    const appMode = getString(Global.AppMode)

    if (appMode === AppMode.LOCAL) {
        await BackgroundService.start(localInference, completionTaskOptions)
    } else {
        await BackgroundService.start(buildAndSendRequest, completionTaskOptions)
    }

    Logger.debug(`Time taken for generateResponse(): ${(performance.now() - data).toFixed(2)}ms`)
}

const getString = (key: string) => {
    return mmkv.getString(key) ?? ''
}
