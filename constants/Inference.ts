import { Chats, useInference } from 'constants/Chat'
import BackgroundService from 'react-native-background-actions'

import { API } from './API'
import { buildAndSendRequest } from './API/APIBuilder'
import { APIState } from './APIState'
import { Characters } from './Characters'
import { AppMode, AppSettings, Global } from './GlobalValues'
import { Logger } from './Logger'
import { mmkv } from './MMKV'

export const regenerateResponse = async (swipeId: number, regenCache: boolean = true) => {
    const charName = Characters.useCharacterCard.getState().card?.name
    const messagesLength = Chats.useChat.getState()?.data?.messages?.length ?? -1
    const message = Chats.useChat.getState()?.data?.messages?.[messagesLength - 1]

    Logger.log('Regenerate Response' + (regenCache ? '' : ' , Resetting Message'))

    if (message?.is_user) {
        await Chats.useChat.getState().addEntry(charName ?? '', true, '')
    } else if (messagesLength && messagesLength !== 1) {
        let replacement = ''

        if (regenCache) replacement = message?.swipes[message.swipe_id].regen_cache ?? ''
        else Chats.useChat.getState().resetRegenCache()

        if (replacement) Chats.useChat.getState().setBuffer(replacement)
        await Chats.useChat.getState().updateEntry(messagesLength - 1, replacement, true, true)
    }
    await generateResponse(swipeId)
}

export const continueResponse = async (swipeId: number) => {
    Logger.log(`Continuing Response`)
    Chats.useChat.getState().setRegenCache()
    Chats.useChat.getState().insertLastToBuffer()
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
    Chats.useChat.getState().startGenerating(swipeId)
    Logger.log(`Obtaining response.`)
    const data = performance.now()
    const appMode = getString(Global.AppMode)
    const APIType = getString(Global.APIType)
    const legacy = mmkv.getBoolean(AppSettings.UseLegacyAPI)
    const apiState = appMode === AppMode.LOCAL ? APIState[API.LOCAL] : APIState?.[APIType as API]
    if (legacy ?? appMode === AppMode.LOCAL) {
        if (apiState) await BackgroundService.start(apiState.inference, completionTaskOptions)
        else {
            Logger.log('An invalid API was somehow chosen, this is bad!', true)
        }
    } else {
        buildAndSendRequest()
    }

    Logger.debug(`Time taken for generateResponse(): ${(performance.now() - data).toFixed(2)}ms`)
}

const getString = (key: string) => {
    return mmkv.getString(key) ?? ''
}
