import { Global } from './GlobalValues'
import { Logger } from './Logger'
import { replaceMacros } from './Utils'
import { mmkv } from './mmkv'
import { create } from 'zustand'
import { Characters } from './Characters'
import { RecentMessages } from './RecentMessages'
import { db } from '@db'
import { chatEntries, chatSwipes, chats } from 'db/schema'
import { eq } from 'drizzle-orm'
import * as FS from 'expo-file-system'
import { LlamaTokenizer } from './tokenizer'
/*
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
    //chat_metadata: ChatMetadata
}*/

export type ChatSwipe = {
    id: number
    entry_id: number
    swipe: string
    send_date: Date
    gen_started: Date
    gen_finished: Date
    token_count?: number
}

export type ChatEntry = {
    id: number
    chat_id: number
    name: string
    is_user: boolean
    order: number
    swipe_id: number
    swipes: Array<ChatSwipe>
}

export type ChatData = {
    id: number
    createDate: Date
    character_id: number
    messages: Array<ChatEntry> | undefined
}

//type ChatDataArray = [ChatInfo, ...ChatEntry[]]

type AbortFunction = () => void

type SetAbortFunction = (fn: AbortFunction) => void

export interface ChatState {
    //id: number | undefined
    //metadata: ChatInfo | undefined
    data: ChatData | undefined
    buffer: string
    load: (chatId: number) => Promise<void>
    delete: (chatId: number) => Promise<void>
    //save: () => Promise<void>
    addEntry: (name: string, is_user: boolean, message: string) => Promise<void>
    updateEntry: (index: number, message: string, updateTime?: boolean) => Promise<void>
    deleteEntry: (index: number) => Promise<void>
    reset: () => void
    swipe: (index: number, direction: number) => Promise<boolean>
    addSwipe: (index: number) => Promise<void>
    getTokenCount: (index: number) => number
    setBuffer: (data: string) => void
    insertBuffer: (data: string) => void
    updateFromBuffer: () => Promise<void>
    insertLastToBuffer: () => void
    nowGenerating: boolean
    stopGenerating: () => void
    startGenerating: () => void
    abortFunction: undefined | AbortFunction
    setAbortFunction: SetAbortFunction
}

export namespace Chats {
    export namespace database {}

    export const useChat = create<ChatState>((set, get: () => ChatState) => ({
        data: undefined,
        buffer: '',
        nowGenerating: false,
        startGenerating: () => {
            get().nowGenerating = true
        },
        stopGenerating: async () => {
            get().nowGenerating = false
            Logger.log(`Saving Chat`)
            await get().updateFromBuffer()
            get().setBuffer('')

            if (mmkv.getBoolean(Global.TTSEnable) && mmkv.getBoolean(Global.TTSAuto)) {
                Logger.log(`Automatically using TTS`)
                mmkv.set(Global.TTSAutoStart, JSON.stringify(true))
            }
        },
        abortFunction: undefined,
        setAbortFunction: (fn) => set((state) => ({ ...state, abortFunction: fn })),
        load: async (chatId: number) => {
            let start = performance.now()
            const data = await readChat(chatId)
            Logger.debug(`[Chats] time for db query: ${performance.now() - start}`)
            start = performance.now()
            set((state: ChatState) => ({
                ...state,
                data: data,
            }))
            Logger.debug(`[Chats] time for zustand set: ${performance.now() - start}`)

            const charName = Characters.useCharacterCard.getState().card?.data.name
            const charId = Characters.useCharacterCard.getState().id
            if (charName && charId) RecentMessages.insertEntry(charName, charId, chatId)
        },

        delete: async (chatId: number) => {
            await deleteChat(chatId)
            if (get().data?.id === chatId) get().reset()
        },

        reset: () =>
            set((state: ChatState) => ({
                ...state,
                data: undefined,
            })),

        //save: async () => {},

        addEntry: async (name: string, is_user: boolean, message: string) => {
            const messages = get().data?.messages
            const chatId = get().data?.id
            if (!messages || !chatId) return
            const order = messages[messages.length - 1].order + 1

            const entry = await createEntry(chatId, name, is_user, order, message)
            if (entry) messages.push(entry)
            set((state) => ({
                ...state,
                data: state?.data ? { ...state.data, messages: messages } : state.data,
            }))
        },

        deleteEntry: async (index: number) => {
            const messages = get().data?.messages
            if (!messages) return
            const entryId = messages[index].id
            if (!entryId) return

            await deleteChatEntry(entryId)

            set((state) => ({
                ...state,
                data: state?.data
                    ? { ...state.data, messages: messages.filter((item, ind) => ind != index) }
                    : state.data,
            }))
        },

        updateEntry: async (index: number, message: string, updateTime = true) => {
            const messages = get()?.data?.messages
            if (!messages) return
            const chatSwipeId = messages[index]?.swipes[messages[index].swipe_id].id
            if (!chatSwipeId) return
            const date = await updateChatSwipe(chatSwipeId, message)
            messages[index].swipes[messages[index].swipe_id].swipe = message
            messages[index].swipes[messages[index].swipe_id].token_count = undefined
            if (updateTime) messages[index].swipes[messages[index].swipe_id].gen_finished = date
            set((state) => ({
                ...state,
                data: state?.data ? { ...state.data, messages: messages } : state.data,
            }))
        },

        // returns true if overflowing right swipe, used to trigger generate
        swipe: async (index: number, direction: number) => {
            const messages = get()?.data?.messages
            if (!messages) return false

            const swipe_id = messages[index].swipe_id
            const target = swipe_id + direction
            const limit = messages[index].swipes.length - 1

            if (target < 0) return false
            if (target > limit) return true
            messages[index].swipe_id = target
            set((state) => ({
                ...state,
                data: state?.data ? { ...state.data, messages: messages } : state.data,
            }))

            const entryId = messages[index].id
            await updateEntrySwipeId(entryId, target)

            return false
        },

        addSwipe: async (index: number) => {
            let messages = get().data?.messages
            if (!messages) return
            const entryId = messages[index].id

            const swipe = await createSwipe(entryId, '')
            if (swipe) messages[index].swipes.push(swipe)
            await updateEntrySwipeId(entryId, messages[index].swipes.length - 1)
            messages[index].swipe_id = messages[index].swipes.length - 1
            set((state: ChatState) => ({
                ...state,
                data: state?.data ? { ...state.data, messages: messages } : state.data,
            }))
        },

        getTokenCount: (index: number) => {
            const messages = get()?.data?.messages
            if (!messages) return 0

            const swipe_id = messages[index].swipe_id
            const cached_token_count = messages[index].swipes[swipe_id].token_count
            if (cached_token_count) return cached_token_count
            const token_count = LlamaTokenizer.encode(messages[index].swipes[swipe_id].swipe).length
            messages[index].swipes[swipe_id].token_count = token_count
            set((state: ChatState) => ({
                ...state,
                data: state?.data ? { ...state.data, messages: messages } : state.data,
            }))
            return token_count
        },
        setBuffer: (newBuffer: string) =>
            set((state: ChatState) => ({ ...state, buffer: newBuffer })),

        insertBuffer: (data: string) =>
            set((state: ChatState) => ({ ...state, buffer: state.buffer + data })),

        updateFromBuffer: async () => {
            const index = get().data?.messages?.length
            if (!index) return
            await get().updateEntry(index - 1, get().buffer)
        },
        insertLastToBuffer: () => {
            const message = get()?.data?.messages?.at(-1)
            if (!message) return
            const mes = message.swipes[message.swipe_id].swipe

            set((state: ChatState) => ({ ...state, buffer: mes }))
        },
    }))

    export const getNewest = async (charId: number): Promise<number | undefined> => {
        const chatIds = await db.query.chats.findMany({ where: eq(chats.character_id, charId) })
        return chatIds?.[chatIds?.length - 1]?.id
    }

    export const getList = async (charId: number) => {
        const chatIds = await db.query.chats.findMany({ where: eq(chats.character_id, charId) })
        return chatIds
    }

    export const debugChatCount = async () => {
        console.log(await FS.readDirectoryAsync(FS.documentDirectory + `characters`))

        const chats = await db.query.chats.findMany()
        console.log(chats.length)
        const entries = await db.query.chatEntries.findMany()
        console.log(entries.length)
        const swipes = await db.query.chatSwipes.findMany()
        console.log(swipes.length)
    }

    export const createChat = async (charId: number) => {
        const card = { ...Characters.useCharacterCard.getState().card }
        const charName = card?.data?.name

        return await db.transaction(async (tx) => {
            if (!card.data || !charName) return
            const [{ chatId }, ..._] = await tx
                .insert(chats)
                .values({
                    character_id: charId,
                })
                .returning({ chatId: chats.id })

            const [{ entryId }, ...__] = await tx
                .insert(chatEntries)
                .values({
                    chat_id: chatId,
                    is_user: false,
                    name: card.data.name,
                    order: 0,
                })
                .returning({ entryId: chatEntries.id })

            await tx.insert(chatSwipes).values({
                entry_id: entryId,
                swipe: replaceMacros(card.data.first_mes),
            })

            for (const i in card.data.alternate_greetings) {
                await tx.insert(chatSwipes).values({
                    entry_id: entryId,
                    swipe: replaceMacros(card.data.alternate_greetings[i]),
                })
            }

            return chatId
        })
    }

    export const createEntry = async (
        chatId: number,
        name: string,
        isUser: boolean,
        order: number,
        message: string
    ) => {
        const [{ entryId }, ...__] = await db
            .insert(chatEntries)
            .values({
                chat_id: chatId,
                name: name,
                is_user: isUser,
                order: order,
            })
            .returning({ entryId: chatEntries.id })
        await db.insert(chatSwipes).values({ swipe: replaceMacros(message), entry_id: entryId })
        const entry = await db.query.chatEntries.findFirst({
            where: eq(chatEntries.id, entryId),
            with: { swipes: true },
        })
        return entry
    }

    export const createSwipe = async (entryId: number, message: string) => {
        const [{ swipeId }, ...__] = await db
            .insert(chatSwipes)
            .values({
                entry_id: entryId,
                swipe: replaceMacros(message),
            })
            .returning({ swipeId: chatSwipes.id })
        return await db.query.chatSwipes.findFirst({ where: eq(chatSwipes.id, swipeId) })
    }

    export const readChat = async (chatId: number): Promise<ChatData | undefined> => {
        const chat = await db.query.chats.findFirst({
            where: eq(chats.id, chatId),
            with: {
                messages: {
                    orderBy: chatEntries.order,
                    with: {
                        swipes: true,
                    },
                },
            },
        })
        if (chat) return { ...chat }
    }

    export const updateEntrySwipeId = async (entryId: number, swipeId: number) => {
        await db.update(chatEntries).set({ swipe_id: swipeId }).where(eq(chatEntries.id, entryId))
    }

    export const updateChatSwipe = async (chatSwipeId: number, message: string) => {
        const date = new Date()
        await db
            .update(chatSwipes)
            .set({ swipe: message, gen_finished: date })
            .where(eq(chatSwipes.id, chatSwipeId))
        return date
    }

    export const deleteChat = async (chatId: number) => {
        await db.delete(chats).where(eq(chats.id, chatId))
    }

    export const deleteChatEntry = async (entryId: number) => {
        await db.delete(chatEntries).where(eq(chatEntries.id, entryId))
    }

    export const dummyEntry: ChatEntry = {
        id: 0,
        chat_id: -1,
        name: '',
        is_user: false,
        order: -1,
        swipe_id: 0,
        swipes: [
            {
                id: -1,
                entry_id: -1,
                swipe: '',
                send_date: new Date(),
                gen_started: new Date(),
                gen_finished: new Date(),
            },
        ],
    }

    export const exists = async (chatId: number) => {
        return await db.query.chats.findFirst({ where: eq(chats.id, chatId) })
    }

    /*
     export const getNumber = async (charName: string): Promise<number> => {
        return await FS.readDirectoryAsync(getChatDir(charName))
            .then((result) => {
                return result.length
            })
            .catch((error) => {
                Logger.log('Could not get Chat list: ' + error, true)
                return 0
            })
    }

    export const getList = async (charName: string): Promise<string[]> => {
        return await FS.readDirectoryAsync(getChatDir(charName)).catch((error) => {
            Logger.log('Could not get Chat list: ' + error, true)
            return []
        })
    }


    export const getNewestOld = async (charName: string): Promise<string | undefined> => {
        const filelist = await FS.readDirectoryAsync(getChatDir(charName))
        return filelist?.[filelist?.length - 1]
    }


      const getChatFileDir = (charName: string, chatfilename: string): string => {
        return `${FS.documentDirectory}characters/${charName}/chats/${chatfilename}`
    }

    const getChatDir = (charName: string): string => {
        return `${FS.documentDirectory}characters/${charName}/chats`
    }

    export const getFileString = async (charName: string, chatName: string): Promise<any> => {
        return await FS.readAsStringAsync(getChatFileDir(charName, chatName), {
            encoding: FS.EncodingType.UTF8,
        }).catch((error) => {
            Logger.log('Failed to get string: ' + error, true)
        })
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

    const defaultExtra = (): ChatExtra => ({
        api: mmkv.getString(Global.APIType) ?? 'undefined',
        model: 'undefined',
    })

    const defaultSwipeInfo = (): ChatSwipeInfo => ({
        send_date: new Date().toString().slice(0, -9),
        gen_finished: new Date().toString(),
        gen_started: new Date().toString(),
        extra: defaultExtra(),
    })
    export const createChatOld = async (
        charId: number,
        userName: string
    ): Promise<undefined | string> => {
        //for now use mmkv, change to zustand later
        // const cardstring = mmkv.getString(Global.CurrentCharacterCard)
        // if (!cardstring) return

        const card = { ...Characters.useCharacterCard.getState().card }
        const charName = card?.data?.name
        if (!card || !charName) return
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
            replaceMacros(card?.data?.first_mes ?? ''),
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

    export const exists = async (charName: string, chatName: string) => {
        return FS.getInfoAsync(getChatFileDir(charName, chatName)).then((info) => info.exists)
    }
    
      export const createEntryOld = (
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
    
    */
}
