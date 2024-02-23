import { Global } from './GlobalValues'
import { mmkv } from './mmkv'

export type RecentEntry = {
    charName: string
    chatName: string
}

const entryLimit = 5

export namespace RecentMessages {
    export const insertEntry = (charName: string, chatName: string) => {
        const data = mmkv.getString(Global.RecentMessages)
        let entries: Array<RecentEntry> = []
        if (data) entries = JSON.parse(data)

        const index = entries.findIndex((item) => item.chatName === chatName)
        if (index !== -1) entries.splice(index, 1)

        entries.push({ charName: charName, chatName: chatName })
        if (entries.length > entryLimit) entries.shift()
        mmkv.set(Global.RecentMessages, JSON.stringify(entries))
    }

    export const flush = () => {
        mmkv.delete(Global.RecentMessages)
    }

    export const deleteEntry = (chatName: string) => {
        const data = mmkv.getString(Global.RecentMessages)
        let entries: Array<RecentEntry> = []
        if (data) entries = JSON.parse(data)
        const index = entries.findIndex((item) => item.chatName === chatName)
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
