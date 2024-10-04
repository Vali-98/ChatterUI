import { Chats, useInference } from 'app/constants/Chat'

import { API } from './API'
import { APIState } from './APIState'
import { Characters } from './Characters'
import { Global } from './GlobalValues'
import { Logger } from './Logger'
import { mmkv } from './MMKV'

export const regenerateResponse = async (swipeId: number, regenCache: boolean = true) => {
    const charName = Characters.useCharacterCard.getState().card?.data.name
    const messagesLength = Chats.useChat.getState()?.data?.messages?.length ?? -1
    const message = Chats.useChat.getState()?.data?.messages?.[messagesLength - 1]

    Logger.log('Regenerate Response' + (!regenCache && ' , Resetting Message'))

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

export const generateResponse = async (swipeId: number) => {
    if (useInference.getState().nowGenerating) {
        Logger.log('Generation already in progress', true)
        return
    }
    Chats.useChat.getState().startGenerating(swipeId)
    Logger.log(`Obtaining response.`)
    const data = performance.now()
    const APIType = getString(Global.APIType)
    const apiState = APIState?.[APIType as API]
    if (apiState) await apiState.inference()
    else {
        Logger.log('An invalid API was somehow chosen, this is bad!', true)
    }

    Logger.debug(`Time taken for generateResponse(): ${(performance.now() - data).toFixed(2)}ms`)
}

const getString = (key: string) => {
    return mmkv.getString(key) ?? ''
}
