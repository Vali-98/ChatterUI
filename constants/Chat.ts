import { Global } from './GlobalValues'
import { Logger } from './Logger'
import { humanizedISO8601DateTime, replaceMacros } from './Utils'
import { mmkv } from './mmkv'
import { create } from 'zustand'
import * as FS from 'expo-file-system'
import { CharacterCardV2 } from './Characters'

export type ChatExtra = {
    api: string
    model: string
}

export type ChatSwipeInfo = {
    send_date: string
    extra: ChatExtra
    gen_started: string
    gen_finished: string
}

export type ChatEntry = {
    name: string
    is_user: boolean
    mes: string
    // metadata
    send_date: string
    gen_started: string
    gen_finished: string
    extra: ChatExtra
    swipe_id: number
    swipes: Array<string>
    swipe_info: Array<ChatSwipeInfo>
}

export type ChatMetadata = {
    note_prompt: string
    note_interval: number
    note_position: number
    note_depth: number
    objective: any
}

export type ChatInfo = {
    userName: string
    charName: string
    createDate: string
    chat_metadata: ChatMetadata
}

type ChatDataArray = [ChatInfo, ...ChatEntry[]]

export interface ChatState {
    name: string | undefined
    metadata: ChatInfo | undefined
    data: Array<ChatEntry> | undefined
    buffer: string
    load: (charName: string, chatName: string) => Promise<void>
    delete: (charName: string, chatName: string) => Promise<void>
    save: () => Promise<void>
    addEntry: (name: string, is_user: boolean, message: string) => void
    updateEntry: (id: number, message: string) => void
    deleteEntry: (id: number) => void
    reset: () => void
    swipe: (id: number, direction: number) => boolean
    addSwipe: () => void
    setBuffer: (data: string) => void
    insertBuffer: (data: string) => void
    updateFromBuffer: () => void
    insertLastToBuffer: () => void
}

export namespace Chats {
    export const useChat = create<ChatState>((set, get: () => ChatState) => ({
        name: undefined,
        metadata: undefined,
        data: undefined,
        buffer: '',
        load: async (charName: string, chatName: string) => {
            const chatlist = await getFileObject(charName, chatName)
            if (!chatlist) return

            const meta = chatlist[0]
            set((state: ChatState) => ({
                ...state,
                metadata: meta as ChatInfo,
                data: chatlist.slice(1) as [ChatEntry],
                name: chatName,
                charName: charName,
            }))
        },

        delete: async (charName: string, chatName: string) => {
            await FS.deleteAsync(getChatFileDir(charName, chatName)).catch((error) => {
                Logger.log('Failed to delete: ' + error, true)
            })
            if (get().name === chatName) get().reset()
        },

        reset: () =>
            set((state: ChatState) => ({
                ...state,
                metadata: undefined,
                data: undefined,
                name: undefined,
                charName: undefined,
            })),

        save: async () => {
            const output: string = [get().metadata, ...(get()?.data ?? [])]
                .map((item) => JSON.stringify(item))
                .join('\u000d\u000a')
            const charName: string = get()?.metadata?.charName ?? ''
            const chatName: string = get().name ?? ''
            if (charName && chatName)
                return FS.writeAsStringAsync(getChatFileDir(charName, chatName), output).catch(
                    (error) => {
                        Logger.log('Failed to save: ' + error, true)
                    }
                )
        },

        addEntry: (name: string, is_user: boolean, message: string) => {
            const entry = createEntry(name, is_user, message)

            set((state: ChatState) => ({
                ...state,
                data: [...(state.data ? state.data : []), entry],
            }))
        },

        deleteEntry: (id: number) =>
            set((state: ChatState) => ({
                ...state,
                data: state.data?.filter((item: ChatEntry, index, number) => index !== id) ?? [],
            })),

        updateEntry: (id: number, message: string) => {
            const data = get().data
            if (!data) return
            data[id].mes = message
            data[id].swipes[data[id].swipe_id] = message
            //set((state: ChatState) => ({ ...state, data: data }))
        },

        // returns true if overflowing right swipe, used to trigger generate
        swipe: (id: number, direction: number) => {
            const message = get()?.data?.[id]

            if (!message) return false

            const target = message.swipe_id + direction
            const limit = message.swipes.length - 1

            if (target < 0) return false
            if (target > limit) return true

            const new_swipe: string = message.swipes.at(target) ?? ''
            const new_info = message.swipe_info.at(target)
            const newmessage: ChatEntry = {
                ...message,
                mes: new_swipe,
                ...new_info,
                swipe_id: target,
            }

            set((state: ChatState) => ({
                ...state,
                data:
                    state.data?.map((item: ChatEntry, index: number) =>
                        id === index ? newmessage : item
                    ) ?? [],
            }))

            return false
        },

        addSwipe: () => {
            let data = get().data
            if (!data) return
            const index = data?.length - 1
            if (!index) return

            data[index] = {
                ...data[index],
                mes: '',
                swipes: [...data[index].swipes, ''],
                swipe_info: [...data[index].swipe_info, defaultSwipeInfo()],
                gen_started: Date(),
                gen_finished: Date(),
                swipe_id: data[index].swipe_id + 1,
            }

            //set((state: ChatState) => ({ ...state, data: data }))
        },

        setBuffer: (newBuffer: string) =>
            set((state: ChatState) => ({ ...state, buffer: newBuffer })),

        insertBuffer: (data: string) =>
            set((state: ChatState) => ({ ...state, buffer: state.buffer + data })),

        updateFromBuffer: () => {
            const data = get()?.data
            if (!data) return
            const lastindex = data.length - 1
            const swipes = data[lastindex].swipes
            const swipe_id = data[lastindex].swipe_id
            swipes[swipe_id] = get().buffer

            const swipe_info = data[lastindex].swipe_info
            swipe_info[swipe_id].gen_finished = new Date().toString()

            data[lastindex] = {
                ...data[lastindex],
                mes: get().buffer,
                gen_finished: new Date().toString(),
                swipes: swipes,
                swipe_info: swipe_info,
            }
            /*
            set((state: ChatState) => ({
                ...state,
                data: data,
            }))*/
        },
        insertLastToBuffer: () =>
            set((state: ChatState) => ({ ...state, buffer: get()?.data?.at(-1)?.mes ?? '' })),
    }))

    const getChatFileDir = (charName: string, chatfilename: string): string => {
        return `${FS.documentDirectory}characters/${charName}/chats/${chatfilename}`
    }

    const getChatDir = (charName: string): string => {
        return `${FS.documentDirectory}characters/${charName}/chats`
    }

    export const getFileObject = async (
        charName: string,
        chatName: string
    ): Promise<ChatDataArray | undefined> => {
        return await FS.readAsStringAsync(getChatFileDir(charName, chatName), {
            encoding: FS.EncodingType.UTF8,
        })
            .then((result) => {
                const chatlist = result
                    .split('\u000d\u000a')
                    .map((row) => JSON.parse(row)) as ChatDataArray
                return chatlist
            })
            .catch((error) => {
                Logger.log('Failed to get object: ' + error, true)
                return undefined
            })
    }
    export const getFileString = async (charName: string, chatName: string): Promise<any> => {
        return await FS.readAsStringAsync(getChatFileDir(charName, chatName), {
            encoding: FS.EncodingType.UTF8,
        }).catch((error) => {
            Logger.log('Failed to get string: ' + error, true)
        })
    }
    export const getNewest = async (charName: string): Promise<string | undefined> => {
        const filelist = await FS.readDirectoryAsync(getChatDir(charName))
        return filelist?.[0]
    }

    export const getList = async (charName: string): Promise<string[]> => {
        return await FS.readDirectoryAsync(getChatDir(charName)).catch((error) => {
            Logger.log('Could not get Chat list: ' + error, true)
            return []
        })
    }

    const defaultExtra = (): ChatExtra => ({
        api: mmkv.getString(Global.APIType) ?? 'undefined',
        model: 'undefined',
    })

    const defaultSwipeInfo = (): ChatSwipeInfo => ({
        send_date: new Date().toString(),
        gen_finished: new Date().toString(),
        gen_started: new Date().toString(),
        extra: defaultExtra(),
    })

    export const createEntry = (
        name: string,
        is_user: boolean,
        message: string,
        swipes: Array<string> = []
    ): ChatEntry => {
        const swipesize = swipes.length + 1

        return {
            name: name,
            is_user: is_user,
            mes: message,
            ...defaultSwipeInfo(),
            swipe_id: 0,
            swipes: [message, ...swipes],
            swipe_info: new Array(swipesize).fill(defaultSwipeInfo()),
        }
    }

    export const createChat = async (
        charName: string,
        userName: string
    ): Promise<undefined | string> => {
        //for now use mmkv, change to zustand later
        const cardstring = mmkv.getString(Global.CurrentCharacterCard)
        if (!cardstring) return
        const card: CharacterCardV2 = JSON.parse(cardstring)
        const metadata: ChatInfo = {
            charName: charName,
            userName: userName,
            createDate: humanizedISO8601DateTime(),
            chat_metadata: {
                note_prompt: 'placeholder',
                note_interval: 1,
                note_position: 1,
                note_depth: 1,
                objective: {},
            },
        }

        const swipes: Array<string> =
            card.data?.alternate_greetings && card.data.alternate_greetings.length > 0
                ? card.data?.alternate_greetings.map((item) => replaceMacros(item))
                : []
        const firstMessage: ChatEntry = createEntry(
            charName,
            false,
            replaceMacros(card.data.first_mes),
            swipes
        )

        const output = `${JSON.stringify(metadata)}\u000d\u000a${JSON.stringify(firstMessage)}`

        return FS.writeAsStringAsync(getChatFileDir(charName, metadata.createDate), output)
            .then(() => {
                return metadata.createDate
            })
            .catch((error) => {
                Logger.log('Failed create message: ' + error, true)
                return undefined
            })
    }
}
