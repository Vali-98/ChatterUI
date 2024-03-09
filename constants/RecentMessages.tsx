import { Global } from './GlobalValues'
import { mmkv } from './mmkv'

export type RecentEntry = {
    charId: number
    chatId: number
    charName: string
    lastModified: string
}

const entryLimit = 5

export namespace RecentMessages {
    export const insertEntry = (charName: string, charId: number, chatId: number) => {
        const data = mmkv.getString(Global.RecentMessages)
        let entries: Array<RecentEntry> = []
        if (data) entries = JSON.parse(data)

        const index = entries.findIndex((item) => item.chatId === chatId)
        if (index !== -1) entries.splice(index, 1)

        entries.push({
            charId: charId,
            charName: charName,
            chatId: chatId,
            lastModified: new Date().toLocaleString(),
        })
        if (entries.length > entryLimit) entries.shift()
        mmkv.set(Global.RecentMessages, JSON.stringify(entries))
    }

    export const flush = () => {
        mmkv.delete(Global.RecentMessages)
    }

    export const deleteEntry = (chatId: number) => {
        const data = mmkv.getString(Global.RecentMessages)
        let entries: Array<RecentEntry> = []
        if (data) entries = JSON.parse(data)
        const index = entries.findIndex((item) => item.chatId === chatId)
        if (index !== -1) entries.splice(index, 1)
        mmkv.set(Global.RecentMessages, JSON.stringify(entries))
    }

    export const deleteByCharacter = (charName: string) => {
        const data = mmkv.getString(Global.RecentMessages)
        let entries: Array<RecentEntry> = []
        if (data) entries = JSON.parse(data)
        const cleaned = entries.filter((item) => item.charName !== charName)
        mmkv.set(Global.RecentMessages, JSON.stringify(cleaned))
    }
}
