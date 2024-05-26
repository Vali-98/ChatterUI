import { db } from '@db'
import { chatEntries, chatSwipes, chats } from 'db/schema'
import { eq } from 'drizzle-orm'
import * as FS from 'expo-file-system'
import { create } from 'zustand'

import { Characters } from './Characters'
import { AppSettings, Global } from './GlobalValues'
import { Logger } from './Logger'
import { RecentMessages } from './RecentMessages'
import { Llama3Tokenizer } from './Tokenizer/tokenizer'
import { replaceMacros } from './Utils'
import { mmkv } from './mmkv'

export type ChatSwipe = {
    id: number
    entry_id: number
    swipe: string
    send_date: Date
    gen_started: Date
    gen_finished: Date
    token_count?: number
    regen_cache?: string
}

export type ChatEntry = {
    id: number
    chat_id: number
    name: string
    is_user: boolean
    order: number
    swipe_id: number
    swipes: ChatSwipe[]
}

export type ChatData = {
    id: number
    createDate: Date
    character_id: number
    messages: ChatEntry[] | undefined
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
    updateEntry: (
        index: number,
        message: string,
        updateFinished?: boolean,
        updateStarted?: boolean
    ) => Promise<void>
    deleteEntry: (index: number) => Promise<void>
    reset: () => void
    swipe: (index: number, direction: number) => Promise<boolean>
    addSwipe: (index: number) => Promise<void>
    getTokenCount: (index: number) => number
    setBuffer: (data: string) => void
    insertBuffer: (data: string) => void
    updateFromBuffer: () => Promise<void>
    insertLastToBuffer: () => void
    setRegenCache: () => void
    stopGenerating: () => void
    startGenerating: () => void
    abortFunction: undefined | AbortFunction
    setAbortFunction: SetAbortFunction
}

type AbortFunctionType = {
    abortFunction?: () => void
    nowGenerating: boolean
    startGenerating: () => void
    stopGenerating: () => void
    setAbort: (fn: () => void) => void
}

export const useInference = create<AbortFunctionType>((set) => ({
    abortFunction: undefined,
    nowGenerating: false,
    startGenerating: () => set((state) => ({ ...state, nowGenerating: true })),
    stopGenerating: () => set((state) => ({ ...state, nowGenerating: false })),
    setAbort: (fn) => {
        Logger.debug('Setting abort function')
        set((state) => ({ ...state, abortFunction: fn }))
    },
}))

export namespace Chats {
    export namespace Database {}

    export const useChat = create<ChatState>((set, get: () => ChatState) => ({
        data: undefined,
        buffer: '',
        startGenerating: () => {
            useInference.getState().startGenerating()
        },
        stopGenerating: async () => {
            useInference.getState().stopGenerating()
            Logger.log(`Saving Chat`)
            await get().updateFromBuffer()
            get().setBuffer('')

            if (mmkv.getBoolean(Global.TTSEnable) && mmkv.getBoolean(Global.TTSAuto)) {
                Logger.log(`Automatically using TTS`)
                mmkv.set(Global.TTSAutoStart, JSON.stringify(true))
            }
        },
        abortFunction: undefined,
        setAbortFunction: (fn) => (get().abortFunction = fn),
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
                    ? { ...state.data, messages: messages.filter((item, ind) => ind !== index) }
                    : state.data,
            }))
        },

        updateEntry: async (
            index: number,
            message: string,
            updateFinished: boolean = true,
            updateStarted: boolean = false
        ) => {
            const messages = get()?.data?.messages
            if (!messages) return
            const chatSwipeId = messages[index]?.swipes[messages[index].swipe_id].id
            if (!chatSwipeId) return
            const date = await updateChatSwipe(chatSwipeId, message, updateStarted, updateFinished)
            messages[index].swipes[messages[index].swipe_id].swipe = message
            messages[index].swipes[messages[index].swipe_id].token_count = undefined
            if (updateFinished) messages[index].swipes[messages[index].swipe_id].gen_finished = date
            if (updateStarted) messages[index].swipes[messages[index].swipe_id].gen_started = date
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
            const messages = get().data?.messages
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
            const token_count = Llama3Tokenizer.encode(
                messages[index].swipes[swipe_id].swipe
            ).length
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
        setRegenCache: () => {
            const messages = get()?.data?.messages
            const message = messages?.[messages.length - 1]
            if (!messages || !message) return
            message.swipes[message.swipe_id].regen_cache = message.swipes[message.swipe_id].swipe
            messages[messages.length - 1] = message
            set((state) => ({
                ...state,
                data: state?.data ? { ...state.data, messages: messages } : state.data,
            }))
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

            // custom setting to not generate first mes
            if (!mmkv.getBoolean(AppSettings.CreateFirstMes)) return chatId

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

            card.data.alternate_greetings.forEach(async (data) => {
                await tx.insert(chatSwipes).values({
                    entry_id: entryId,
                    swipe: replaceMacros(data),
                })
            })

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

    export const updateChatSwipe = async (
        chatSwipeId: number,
        message: string,
        updateStarted: boolean,
        updateFinished: boolean
    ) => {
        const date = new Date()
        type UpdatedEntry = {
            swipe: string
            gen_started?: Date
            gen_finished?: Date
        }

        const data: UpdatedEntry = { swipe: message }
        if (updateStarted) data.gen_started = date
        if (updateFinished) data.gen_finished = date
        await db.update(chatSwipes).set(data).where(eq(chatSwipes.id, chatSwipeId))
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
}
