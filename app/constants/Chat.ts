import { db as database } from '@db'
import { chatEntries, chatSwipes, chats } from 'db/schema'
import { count, desc, eq, getTableColumns } from 'drizzle-orm'
import { create } from 'zustand'

import { API } from './API'
import { Characters } from './Characters'
import { AppSettings, Global } from './GlobalValues'
import { Llama } from './LlamaLocal'
import { Logger } from './Logger'
import { mmkv } from './MMKV'
import { convertToFormatInstruct } from './TextFormat'
import { Tokenizer } from './Tokenizer'
import { replaceMacros } from './Utils'

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
    create_date: Date
    character_id: number
    name: string
    messages: ChatEntry[] | undefined
}

type AbortFunction = () => void

export interface ChatState {
    data: ChatData | undefined
    buffer: string
    load: (chatId: number) => Promise<void>
    delete: (chatId: number) => Promise<void>
    addEntry: (name: string, is_user: boolean, message: string) => Promise<number | void>
    updateEntry: (
        index: number,
        message: string,
        updateFinished?: boolean,
        updateStarted?: boolean,
        verifySwipeId?: number
    ) => Promise<void>
    deleteEntry: (index: number) => Promise<void>
    reset: () => void
    swipe: (index: number, direction: number) => Promise<boolean>
    addSwipe: (index: number) => Promise<number | void>
    getTokenCount: (index: number) => number
    setBuffer: (data: string) => void
    insertBuffer: (data: string) => void
    updateFromBuffer: (cachedSwipeId?: number) => Promise<void>
    insertLastToBuffer: () => void
    setRegenCache: () => void
    getRegenCache: () => string
    resetRegenCache: () => void
    stopGenerating: () => void
    startGenerating: (swipeId: number) => void
}

type AbortFunctionType = {
    abortFunction: () => void | Promise<void>
    nowGenerating: boolean
    currentSwipeId?: number
    startGenerating: (swipeId: number) => void
    stopGenerating: () => void
    setAbort: (fn: () => void | Promise<void>) => void
}

export const useInference = create<AbortFunctionType>((set, get) => ({
    abortFunction: () => {
        get().stopGenerating()
    },
    nowGenerating: false,
    currentSwipeId: undefined,
    startGenerating: (swipeId: number) =>
        set((state) => ({ ...state, currentSwipeId: swipeId, nowGenerating: true })),
    stopGenerating: () =>
        set((state) => ({ ...state, nowGenerating: false, currentSwipeId: undefined })),
    setAbort: (fn) => {
        Logger.debug('Setting abort function')
        set((state) => ({
            ...state,
            abortFunction: async () => {
                await fn()
                get().stopGenerating()
            },
        }))
    },
}))

export namespace Chats {
    export const useChat = create<ChatState>((set, get: () => ChatState) => ({
        data: undefined,
        buffer: '',
        startGenerating: (swipeId: number) => {
            useInference.getState().startGenerating(swipeId)
        },
        stopGenerating: async () => {
            const cachedSwipeId = useInference.getState().currentSwipeId
            Logger.log(`Saving Chat`)
            await get().updateFromBuffer(cachedSwipeId)
            useInference.getState().stopGenerating()
            get().setBuffer('')

            if (mmkv.getBoolean(Global.TTSEnable) && mmkv.getBoolean(Global.TTSAuto)) {
                Logger.log(`Automatically using TTS`)
                mmkv.set(Global.TTSAutoStart, JSON.stringify(true))
            }
        },
        load: async (chatId: number) => {
            //let start = performance.now()
            const data = await db.query.chat(chatId)
            //Logger.debug(`[Chats] time for database query: ${performance.now() - start}`)
            //start = performance.now()
            set((state: ChatState) => ({
                ...state,
                data: data,
            }))
            //Logger.debug(`[Chats] time for zustand set: ${performance.now() - start}`)
            db.mutate.updateChatModified(chatId)
        },

        delete: async (chatId: number) => {
            await db.mutate.deleteChat(chatId)
            if (get().data?.id === chatId) get().reset()
        },

        reset: () =>
            set((state: ChatState) => ({
                ...state,
                data: undefined,
            })),

        addEntry: async (name: string, is_user: boolean, message: string) => {
            const messages = get().data?.messages
            const chatId = get().data?.id
            if (!messages || !chatId) return
            const order = messages.length > 0 ? messages[messages.length - 1].order + 1 : 0

            const entry = await db.mutate.createEntry(chatId, name, is_user, order, message)
            if (entry) messages.push(entry)
            set((state) => ({
                ...state,
                data: state?.data ? { ...state.data, messages: messages } : state.data,
            }))
            return entry?.swipes[0].id
        },
        deleteEntry: async (index: number) => {
            const messages = get().data?.messages
            if (!messages) return
            const entryId = messages[index].id
            if (!entryId) return

            await db.mutate.deleteChatEntry(entryId)

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
            updateStarted: boolean = false,
            verifySwipeId: number | undefined = undefined
        ) => {
            const messages = get()?.data?.messages
            if (!messages) return

            let chatSwipeId: number | undefined =
                messages[index]?.swipes[messages[index].swipe_id].id
            let updateState = true

            if (verifySwipeId) {
                updateState = verifySwipeId === chatSwipeId
                if (!updateState) {
                    chatSwipeId = verifySwipeId
                }
            }

            if (!chatSwipeId) return

            const date = await db.mutate.updateChatSwipe(
                chatSwipeId,
                message,
                updateStarted,
                updateFinished
            )
            if (!updateState) return
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
            await db.mutate.updateEntrySwipeId(entryId, target)

            return false
        },

        addSwipe: async (index: number) => {
            const messages = get().data?.messages
            if (!messages) return
            const entryId = messages[index].id

            const swipe = await db.mutate.createSwipe(entryId, '')
            if (swipe) messages[index].swipes.push(swipe)
            await db.mutate.updateEntrySwipeId(entryId, messages[index].swipes.length - 1)
            messages[index].swipe_id = messages[index].swipes.length - 1
            set((state: ChatState) => ({
                ...state,
                data: state?.data ? { ...state.data, messages: messages } : state.data,
            }))
            return swipe?.id
        },

        getTokenCount: (index: number) => {
            const messages = get()?.data?.messages
            if (!messages) return 0

            const swipe_id = messages[index].swipe_id
            const cached_token_count = messages[index].swipes[swipe_id].token_count
            if (cached_token_count) return cached_token_count
            const getTokenCount =
                mmkv.getString(Global.APIType) === API.LOCAL
                    ? Llama.useLlama.getState().tokenLength
                    : Tokenizer.useTokenizer.getState().getTokenCount

            const token_count = getTokenCount(messages[index].swipes[swipe_id].swipe)
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

        updateFromBuffer: async (cachedSwipeId) => {
            const index = get().data?.messages?.length
            if (!index) {
                // this means there is no chat loaded, we need to update the db anyways
                if (cachedSwipeId) {
                    await db.mutate.updateChatSwipe(cachedSwipeId, get().buffer, false, true)
                }
                return
            }
            await get().updateEntry(index - 1, get().buffer, true, false, cachedSwipeId)
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
        getRegenCache: () => {
            const messages = get()?.data?.messages
            const message = messages?.[messages.length - 1]
            if (!messages || !message) return ''
            return message.swipes[message.swipe_id].regen_cache ?? ''
        },
        resetRegenCache: () => {
            const messages = get()?.data?.messages
            const message = messages?.[messages.length - 1]
            if (!messages || !message) return
            message.swipes[message.swipe_id].regen_cache = ''
            messages[messages.length - 1] = message
            set((state) => ({
                ...state,
                data: state?.data ? { ...state.data, messages: messages } : state.data,
            }))
        },
    }))

    export namespace db {
        export namespace query {
            export const chat = async (chatId: number): Promise<ChatData | undefined> => {
                const chat = await database.query.chats.findFirst({
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

            export const chatNewestId = async (charId: number): Promise<number | undefined> => {
                const result = await database.query.chats.findFirst({
                    orderBy: desc(chats.last_modified),
                    where: eq(chats.character_id, charId),
                })
                return result?.id
            }

            export const chatNewest = async () => {
                const result = await database.query.chats.findFirst({
                    orderBy: desc(chats.last_modified),
                })
                return result
            }

            export const chatList = async (charId: number) => {
                const result = await database
                    .select({
                        ...getTableColumns(chats),
                        entryCount: count(chatEntries.id),
                    })
                    .from(chats)
                    .leftJoin(chatEntries, eq(chats.id, chatEntries.chat_id))
                    .groupBy(chats.id)
                    .where(eq(chats.character_id, charId))
                return result
            }

            export const chatListQuery = (charId: number) => {
                return database
                    .select({
                        ...getTableColumns(chats),
                        entryCount: count(chatEntries.id),
                    })
                    .from(chats)
                    .leftJoin(chatEntries, eq(chats.id, chatEntries.chat_id))
                    .groupBy(chats.id)
                    .where(eq(chats.character_id, charId))
                    .orderBy(desc(chats.last_modified))
            }

            export const chatExists = async (chatId: number) => {
                return await database.query.chats.findFirst({ where: eq(chats.id, chatId) })
            }
        }
        export namespace mutate {
            //TODO : refactor this, the requirement to pull charID is not needed, no error handling either
            export const createChat = async (charId: number) => {
                const card = { ...Characters.useCharacterCard.getState().card }
                const charName = card?.data?.name
                return await database.transaction(async (tx) => {
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
                        swipe: convertToFormatInstruct(replaceMacros(card.data.first_mes)),
                    })

                    card.data.alternate_greetings.forEach(async (data) => {
                        await tx.insert(chatSwipes).values({
                            entry_id: entryId,
                            swipe: convertToFormatInstruct(replaceMacros(data)),
                        })
                    })
                    await Characters.db.mutate.updateModified(charId)
                    return chatId
                })
            }

            export const updateChatModified = async (chatID: number) => {
                const chat = await database.query.chats.findFirst({ where: eq(chats.id, chatID) })
                if (chat?.character_id) {
                    await Characters.db.mutate.updateModified(chat.character_id)
                }
                await database
                    .update(chats)
                    .set({ last_modified: new Date().getTime() })
                    .where(eq(chats.id, chatID))
            }

            export const createEntry = async (
                chatId: number,
                name: string,
                isUser: boolean,
                order: number,
                message: string
            ) => {
                const [{ entryId }, ...__] = await database
                    .insert(chatEntries)
                    .values({
                        chat_id: chatId,
                        name: name,
                        is_user: isUser,
                        order: order,
                    })
                    .returning({ entryId: chatEntries.id })
                await database
                    .insert(chatSwipes)
                    .values({ swipe: replaceMacros(message), entry_id: entryId })
                const entry = await database.query.chatEntries.findFirst({
                    where: eq(chatEntries.id, entryId),
                    with: { swipes: true },
                })
                await updateChatModified(chatId)
                return entry
            }

            export const updateEntryModified = async (entryId: number) => {
                const entry = await database.query.chatEntries.findFirst({
                    where: eq(chatEntries.id, entryId),
                })
                if (entry?.chat_id) {
                    await updateChatModified(entry.chat_id)
                }
            }

            export const createSwipe = async (entryId: number, message: string) => {
                const [{ swipeId }, ...__] = await database
                    .insert(chatSwipes)
                    .values({
                        entry_id: entryId,
                        swipe: replaceMacros(message),
                    })
                    .returning({ swipeId: chatSwipes.id })
                await updateEntryModified(entryId)
                return await database.query.chatSwipes.findFirst({
                    where: eq(chatSwipes.id, swipeId),
                })
            }

            export const updateEntrySwipeId = async (entryId: number, swipeId: number) => {
                await updateEntryModified(entryId)
                await database
                    .update(chatEntries)
                    .set({ swipe_id: swipeId })
                    .where(eq(chatEntries.id, entryId))
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
                await database.update(chatSwipes).set(data).where(eq(chatSwipes.id, chatSwipeId))
                const swipe = await database.query.chatSwipes.findFirst({
                    where: eq(chatSwipes.id, chatSwipeId),
                })
                if (swipe?.entry_id) updateEntryModified(swipe.entry_id)
                return date
            }

            export const deleteChat = async (chatId: number) => {
                await updateChatModified(chatId)
                await database.delete(chats).where(eq(chats.id, chatId))
            }

            export const deleteChatEntry = async (entryId: number) => {
                await updateEntryModified(entryId)
                await database.delete(chatEntries).where(eq(chatEntries.id, entryId))
            }

            export const cloneChat = async (chatId: number, limit?: number) => {
                const result = await database.query.chats.findFirst({
                    where: eq(chats.id, chatId),
                    columns: { id: false },
                    with: {
                        messages: {
                            columns: { id: false },
                            orderBy: chatEntries.order,
                            with: {
                                swipes: {
                                    columns: { id: false },
                                },
                            },
                            ...(limit && { limit: limit }),
                        },
                    },
                })
                if (!result) return

                result.last_modified = new Date().getTime()

                const [{ newChatId }, ..._] = await database
                    .insert(chats)
                    .values(result)
                    .returning({ newChatId: chats.id })

                result.messages.forEach((item) => {
                    item.chat_id = newChatId
                })

                const newEntryIds = await database
                    .insert(chatEntries)
                    .values(result.messages)
                    .returning({ newEntryId: chatEntries.id })

                result.messages.forEach((item, index) => {
                    item.swipes.forEach((item2) => {
                        item2.entry_id = newEntryIds[index].newEntryId
                    })
                })

                const swipes = result.messages.map((item) => item.swipes).flat()

                await database.insert(chatSwipes).values(swipes)
            }

            export const renameChat = async (chatId: number, name: string) => {
                await database.update(chats).set({ name: name }).where(eq(chats.id, chatId))
            }
        }
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
}
