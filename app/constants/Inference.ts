import { Chats, useInference } from 'app/constants/Chat'

import { API } from './API'
import { APIState } from './APIState'
import { Characters } from './Characters'
import { Global } from './GlobalValues'
import { Logger } from './Logger'
import { mmkv } from './MMKV'

export const regenerateResponse = async () => {
    const charName = Characters.useCharacterCard.getState().card?.data.name
    const messagesLength = Chats.useChat.getState()?.data?.messages?.length ?? -1
    const message = Chats.useChat.getState()?.data?.messages?.[messagesLength - 1]

    Logger.log('Regenerate Response')
    if (!message?.is_user && messagesLength && messagesLength !== 1) {
        const replacement = message?.swipes[message.swipe_id].regen_cache ?? ''
        if (replacement) Chats.useChat.getState().setBuffer(replacement)
        await Chats.useChat.getState().updateEntry(messagesLength - 1, replacement, true, true)
    } else await Chats.useChat.getState().addEntry(charName ?? '', true, '')
    generateResponse()
}

export const continueResponse = () => {
    Logger.log(`Continuing Response`)
    Chats.useChat.getState().setRegenCache()
    Chats.useChat.getState().insertLastToBuffer()
    generateResponse()
}

export const generateResponse = async () => {
    if (useInference.getState().nowGenerating) {
        Logger.log('Generation already in progress', true)
        return
    }
    Chats.useChat.getState().startGenerating()
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
