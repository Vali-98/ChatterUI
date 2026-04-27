import { and, count, desc, eq, getTableColumns, like, not, sql } from 'drizzle-orm'
import { randomUUID } from 'expo-crypto'
import * as Notifications from 'expo-notifications'
import mime from 'mime/lite'
import { create } from 'zustand'
import { useShallow } from 'zustand/react/shallow'

import { db as database } from '@db'
import { Tokenizer } from '@lib/engine/Tokenizer'
import { replaceMacros } from '@lib/state/Macros'
import { AppDirectory, copyFile, deleteFile, fileInfo } from '@lib/utils/File'
import { convertToFormatInstruct } from '@lib/utils/TextFormat'
import {
    chatAttachments,
    ChatAttachmentType,
    chatEntries,
    ChatEntryType,
    chats,
    ChatSwipe,
    chatSwipes,
    ChatType,
    CompletionTimings,
} from 'db/schema'

import { Characters } from './Characters'
import { Logger } from './Logger'
import { AppSettings } from '../constants/GlobalValues'
import { mmkv } from '../storage/MMKV'

export interface ChatSwipeState extends ChatSwipe {
    token_count?: number
    attachment_count?: number
    regen_cache?: string
}

export interface ChatEntry extends ChatEntryType {
    swipes: ChatSwipeState[]
    attachments: ChatAttachmentType[]
}

export interface ChatData extends ChatType {
    messages: ChatEntry[]
    autoScroll?: { cause: 'search' | 'saveScroll'; index: number }
}

interface ChatSearchQueryResult {
    swipeId: number
    chatId: number
    chatEntryId: number
    chatName: string
    swipe: string
    sendDate: number
}

interface ChatSearchResult extends Omit<ChatSearchQueryResult, 'sendDate'> {
    sendDate: Date
}

export type ScrollData = { cause: 'search' | 'saveScroll'; index: number }

type UpdateChatSwipeOptions = {
    updateFinished?: boolean
    updateStarted?: boolean
    timings?: CompletionTimings
    resetTimings?: boolean
}

export interface ChatState {
    id?: number
    scrollData?: ScrollData
    buffer: OutputBuffer
    // chat data
    setId: (chatId: number) => Promise<void>
    reset: () => void
    setBuffer: (data: OutputBuffer) => void
    insertToBuffer: (data: string) => void
    updateFromBuffer: (swipeId: number) => Promise<void>
}

type InferenceStateType = {
    abortFunction: () => void | Promise<void>
    nowGenerating: boolean
    currentSwipeId?: number
    startGenerating: (swipeId: number) => void
    stopGenerating: () => void
    setAbort: (fn: () => void | Promise<void>) => void
}

type OutputBuffer = {
    data: string
    timings?: CompletionTimings
    error?: string
}

type ChatSwipeUpdated = Pick<ChatSwipe, 'swipe' | 'id'> & Partial<Omit<ChatSwipe, 'swipe' | 'id'>>
// TODO: Functionalize and move elsewhere
export const sendGenerateCompleteNotification = async () => {
    const showMessage = mmkv.getBoolean(AppSettings.ShowNotificationText)

    const notificationTitle = showMessage
        ? (Characters.useCharacterStore.getState().card?.name ?? '')
        : 'Response Complete'

    const notificationText = showMessage
        ? Chats.useChatState.getState().buffer?.data?.trim()
        : 'ChatterUI has finished a response.'

    Notifications.scheduleNotificationAsync({
        content: {
            title: notificationTitle,
            body: notificationText,
            sound: mmkv.getBoolean(AppSettings.PlayNotificationSound),
            vibrate: mmkv.getBoolean(AppSettings.VibrateNotification) ? [250, 125, 250] : undefined,
            badge: 0,
            data: {
                chatId: Chats.useChatState.getState().id,
                characterId: Characters.useCharacterStore.getState().id,
            },
        },
        trigger: null,
    })
    Notifications.setBadgeCountAsync(0)
}

const setMismatchedUser = async (userId: number) => {
    if (!userId || !mmkv.getBoolean(AppSettings.AutoLoadUser)) return

    const currentUserId = Characters.useUserStore.getState().id
    if (currentUserId === userId) return

    Logger.info('Autoloading User with ID: ' + userId)
    const name = await Characters.useUserStore.getState().setCard(userId)

    if (name) Logger.infoToast('Loading User : ' + name)
    else
        Logger.warn(
            `Failed to load User with ID ${userId}, it was likely deleted. Consider relinking this chat.`
        )
}

export const useInference = create<InferenceStateType>((set, get) => ({
    abortFunction: () => {
        get().stopGenerating()
    },
    nowGenerating: false,
    currentSwipeId: undefined,
    startGenerating: (swipeId: number) => set({ currentSwipeId: swipeId, nowGenerating: true }),
    stopGenerating: async () => {
        const swipeId = get().currentSwipeId
        if (swipeId) {
            Logger.info(`Saving Chat`)
            await Chats.useChatState.getState().updateFromBuffer(swipeId)
        }
        requestAnimationFrame(() => {
            set({ nowGenerating: false, currentSwipeId: undefined })
            Chats.useChatState.getState().setBuffer({ data: '' })
        })
        if (mmkv.getBoolean(AppSettings.NotifyOnComplete)) sendGenerateCompleteNotification()
    },
    setAbort: (fn) => {
        set({
            abortFunction: async () => {
                await fn()
            },
        })
    },
}))

export namespace Chats {
    export const useChatState = create<ChatState>((set, get: () => ChatState) => ({
        buffer: { data: '' },
        setId: async (chatId) => {
            const data = { ...(await db.query.chatNew(chatId)), autoScroll: undefined }
            let autoScroll: { cause: 'search' | 'saveScroll'; index: number } | undefined =
                undefined
            if (!data) {
                Logger.errorToast('Failed to load chat')
                Logger.error(`Chat data for id ${chatId} was invalid: ${JSON.stringify(data)}`)
                return
            }
            if (data.user_id) await setMismatchedUser(data.user_id)
            if (data) {
                const index = data.scroll_offset ?? data.entriesCount
                autoScroll = {
                    cause: 'saveScroll',
                    index: Math.min(index, data.entriesCount - 1),
                }
            }

            set({
                id: chatId,
                scrollData: autoScroll,
            })
        },

        reset: () => set({ id: undefined }),

        setBuffer: (newBuffer: OutputBuffer) => set({ buffer: newBuffer }),

        insertToBuffer: (data: string) =>
            set((state: ChatState) => ({
                buffer: { ...state.buffer, data: state.buffer.data + data },
            })),

        updateFromBuffer: async (swipeId) => {
            const buffer = get().buffer

            await db.mutate.updateChatSwipe(swipeId, buffer.data, {
                timings: buffer.timings,
            })
        },
    }))

    export namespace db {
        export namespace query {
            export const chat = async (chatId: number) => {
                const chat = await database.query.chats.findFirst({
                    where: eq(chats.id, chatId),
                    with: {
                        messages: {
                            with: {
                                swipes: true,
                                attachments: true,
                            },
                        },
                    },
                })
                if (chat) return { ...chat }
            }

            export const chatNew = async (chatId: number) => {
                const [result] = await database
                    .select({
                        user_id: chats.user_id,
                        scroll_offset: chats.scroll_offset,
                        entriesCount: count(chatEntries.id),
                    })
                    .from(chats)
                    .leftJoin(chatEntries, eq(chatEntries.chat_id, chats.id))
                    .where(eq(chats.id, chatId))
                    .groupBy(chats.id)

                return result
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

            export const searchChat = async (
                query: string,
                charId: number
            ): Promise<ChatSearchResult[]> => {
                const swipesWithIndex = sql`
                    SELECT
                        ${chatSwipes.id} AS swipeId,
                        ${chatSwipes.entry_id} AS entryId,
                        ${chatSwipes.swipe},
                        ${chatSwipes.send_date} AS sendDate,
                        ROW_NUMBER() OVER (PARTITION BY ${chatSwipes.entry_id} ORDER BY ${chatSwipes.id}) AS swipeIndex
                    FROM ${chatSwipes}
                    `

                const result = (await database
                    .select({
                        swipeId: sql`swipeId`,
                        chatId: chatEntries.chat_id,
                        chatEntryId: chatEntries.id,
                        chatName: chats.name,
                        swipe: sql`swipe`,
                        sendDate: sql`sendDate`,
                    })
                    .from(chatEntries)
                    .innerJoin(
                        sql`(${swipesWithIndex}) AS swi`,
                        sql`swi.entryId = ${chatEntries.id} AND swi.swipeIndex = ${chatEntries.swipe_id} + 1`
                    )
                    .innerJoin(chats, eq(chatEntries.chat_id, chats.id))
                    .where(and(like(sql`swipe`, `%${query}%`), eq(chats.character_id, charId)))
                    .orderBy(sql`sendDate`)
                    .limit(100)) as ChatSearchQueryResult[]

                return result.map((item) => {
                    return { ...item, sendDate: new Date(item.sendDate * 1000) }
                })
            }

            export const chatWithoutId = async (chatId: number, limit?: number) => {
                return await database.query.chats.findFirst({
                    where: eq(chats.id, chatId),
                    columns: { id: false },
                    with: {
                        messages: {
                            columns: { id: false },
                            with: {
                                swipes: {
                                    columns: { id: false },
                                },
                            },
                            ...(limit && { limit: limit }),
                        },
                    },
                })
            }

            export const chatLatestSwipe = async (chatId: number) => {
                const result = await database.query.chatEntries.findFirst({
                    where: eq(chatEntries.chat_id, chatId),
                    orderBy: desc(chatEntries.id),
                    with: {
                        swipes: true,
                    },
                })
                if (!result) return null
                return result.swipes?.[0]
            }

            export const chatName = async (chatId: number) => {
                const result = await database.query.chats.findFirst({
                    columns: { name: true },
                    where: eq(chats.id, chatId),
                })
                if (result) return result.name
            }
        }
        export namespace mutate {
            export const createChat = async (charId: number) => {
                const card = await Characters.db.query.card(charId)
                if (!card) {
                    Logger.error('Character does not exist!')
                    return
                }
                const userId = Characters.useUserStore.getState().id
                const charName = card.name
                return await database.transaction(async (tx) => {
                    if (!card || !charName) return
                    const [{ chatId }] = await tx
                        .insert(chats)
                        .values({
                            character_id: charId,
                            user_id: userId ?? null,
                        })
                        .returning({ chatId: chats.id })

                    // custom setting to not generate first mes
                    if (!mmkv.getBoolean(AppSettings.CreateFirstMes)) return chatId
                    const greetings = [
                        card.first_mes ?? '',
                        ...card.alternate_greetings.map((item) => item.greeting),
                    ].filter((item) => item)

                    if (greetings.length > 0) {
                        const [{ entryId }] = await tx
                            .insert(chatEntries)
                            .values({
                                chat_id: chatId,
                                is_user: false,
                                name: card.name ?? '',
                                order: 0,
                            })
                            .returning({ entryId: chatEntries.id })

                        await tx.insert(chatSwipes).values(
                            greetings.map((item) => ({
                                entry_id: entryId,
                                swipe: convertToFormatInstruct(replaceMacros(item)),
                            }))
                        )
                    }

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
                    .set({ last_modified: Date.now() })
                    .where(eq(chats.id, chatID))
            }

            export const createEntry = async (
                chatId: number,
                name: string,
                isUser: boolean,
                message: string,
                attachments: string[] = []
            ) => {
                /**order is no longer used, may be useless */
                const { order } = (await database.query.chatEntries.findFirst({
                    where: eq(chatEntries.chat_id, chatId),
                    orderBy: desc(chatEntries.id),
                    columns: {
                        order: true,
                    },
                })) ?? { order: 0 }

                const [{ entryId }] = await database
                    .insert(chatEntries)
                    .values({
                        chat_id: chatId,
                        name: name,
                        is_user: isUser,
                        order: order,
                    })
                    .returning({ entryId: chatEntries.id })

                const [{ swipeId }] = await database
                    .insert(chatSwipes)
                    .values({ swipe: replaceMacros(message), entry_id: entryId, active: true })
                    .returning({ swipeId: chatSwipes.id })
                await deactivateOtherSwipes(entryId, swipeId)

                await Promise.all(
                    attachments.map(async (uri) => {
                        await createAttachment(entryId, uri)
                    })
                )

                const entry = await database.query.chatEntries.findFirst({
                    where: eq(chatEntries.id, entryId),
                    with: { swipes: true, attachments: true },
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
                const [swipe] = await database
                    .insert(chatSwipes)
                    .values({
                        entry_id: entryId,
                        swipe: replaceMacros(message),
                        active: true,
                    })
                    .returning()
                await updateEntryModified(entryId)
                await deactivateOtherSwipes(entryId, swipe.id)
                return swipe
            }

            export const activateSwipe = async (swipeId: number) => {
                const [{ entryId }] = await database
                    .update(chatSwipes)
                    .set({ active: true })
                    .where(eq(chatSwipes.id, swipeId))
                    .returning({ entryId: chatSwipes.entry_id })

                await deactivateOtherSwipes(entryId, swipeId)
            }

            const deactivateOtherSwipes = async (entryId: number, swipeId: number) => {
                await database
                    .update(chatSwipes)
                    .set({ active: false })
                    .where(and(eq(chatSwipes.entry_id, entryId), not(eq(chatSwipes.id, swipeId))))
            }

            export const updateChatSwipe = async (
                chatSwipeId: number,
                message: string,
                options: UpdateChatSwipeOptions = {}
            ) => {
                if (!chatSwipeId) return

                const { updateFinished, updateStarted, timings, resetTimings } = options
                const date = new Date()
                const tokenizer = Tokenizer.getTokenizer()
                const updatedSwipe: ChatSwipeUpdated = {
                    id: chatSwipeId,
                    swipe: message,
                    token_length: await tokenizer(message).catch(() => 0),
                }

                if (updateFinished) updatedSwipe.gen_finished = date
                if (updateStarted) updatedSwipe.gen_started = date
                if (timings) updatedSwipe.timings = timings
                if (resetTimings) updatedSwipe.timings = null

                await database
                    .update(chatSwipes)
                    .set(updatedSwipe)
                    .where(eq(chatSwipes.id, chatSwipeId))

                const swipe = await database.query.chatSwipes.findFirst({
                    where: eq(chatSwipes.id, chatSwipeId),
                })

                if (swipe?.entry_id) updateEntryModified(swipe.entry_id)
            }

            export const updateSwipeResetLength = async (swipeId: number, length: number) => {
                await database
                    .update(chatSwipes)
                    .set({ reset_length: length })
                    .where(eq(chatSwipes.id, swipeId))
            }

            export const deleteChat = async (chatId: number) => {
                await updateChatModified(chatId)
                await database.delete(chats).where(eq(chats.id, chatId))
            }

            export const deleteChatEntry = async (entryId: number) => {
                await updateEntryModified(entryId)
                const attachments = await database.query.chatAttachments.findMany({
                    where: eq(chatAttachments.chat_entry_id, entryId),
                })
                await Promise.all(attachments.map(async (item) => deleteFile(item.uri)))

                await database.delete(chatEntries).where(eq(chatEntries.id, entryId))
            }

            export const cloneChat = async (
                chat: NonNullable<Awaited<ReturnType<typeof query.chatWithoutId>>>
            ) => {
                chat.last_modified = Date.now()

                const newChatId = await database.transaction(async (tx) => {
                    const [{ newChatId }] = await tx
                        .insert(chats)
                        .values(chat)
                        .returning({ newChatId: chats.id })

                    chat.messages.forEach((item) => {
                        item.chat_id = newChatId
                    })
                    const newEntryIds = await tx
                        .insert(chatEntries)
                        .values(chat.messages)
                        .returning({ newEntryId: chatEntries.id })

                    chat.messages.forEach((message, index) => {
                        message.swipes.forEach((swipe) => {
                            swipe.entry_id = newEntryIds[index].newEntryId
                        })
                    })
                    const swipes = chat.messages.map((item) => item.swipes).flat()
                    await tx.insert(chatSwipes).values(swipes)
                    return newChatId
                })
                return newChatId
            }

            export const cloneChatFromId = async (chatId: number, limit?: number) => {
                const result = await query.chatWithoutId(chatId, limit)
                if (!result) return

                result.last_modified = Date.now()
                const newChatid = await cloneChat(result)
                return newChatid
            }

            export const renameChat = async (chatId: number, name: string) => {
                await database.update(chats).set({ name: name }).where(eq(chats.id, chatId))
            }

            export const updateUser = async (chatId: number, userId: number) => {
                await database.update(chats).set({ user_id: userId }).where(eq(chats.id, chatId))
            }

            export const createAttachment = async (entryId: number, uri: string) => {
                const attachmentId = randomUUID()
                const info = fileInfo(uri)
                if (!info.exists) return

                const name = uri.split('/').pop() ?? 'unknown'
                const extension = name.split('.').pop()?.toLowerCase()
                const mimeType = mime.getType(uri)
                const type = mimeType?.split('/')?.[0]
                if (!name || !extension || !mimeType || !type || !validExtensionTypes(type)) return
                const newURI = AppDirectory.Attachments + attachmentId + '.' + extension
                copyFile({
                    from: uri,
                    to: newURI,
                })
                const [attachment] = await database
                    .insert(chatAttachments)
                    .values({
                        type: type,
                        name: name,
                        chat_entry_id: entryId,
                        uri: newURI,
                        mime_type: mimeType,
                    })
                    .returning()
                return attachment
            }

            export const deleteAttachment = async (attachmentId: number) => {
                await database.delete(chatAttachments).where(eq(chatAttachments.id, attachmentId))
            }

            export const updateScrollOffset = async (chatId: number, scrollOffset: number) => {
                await database
                    .update(chats)
                    .set({ scroll_offset: scrollOffset })
                    .where(eq(chats.id, chatId))
            }
        }

        export namespace live {
            export const entryIdList = (chatId: number) => {
                return database.query.chatEntries.findMany({
                    where: eq(chatEntries.chat_id, chatId),
                    columns: {
                        id: true,
                    },
                    orderBy: desc(chatEntries.id),
                })
            }

            export const entry = (entryId: number) => {
                return database.query.chatEntries.findFirst({
                    where: eq(chatEntries.id, entryId),
                    with: {
                        attachments: true,
                    },
                })
            }

            export const activeSwipeByEntry = (entryId: number) => {
                return database.query.chatSwipes.findFirst({
                    where: and(eq(chatSwipes.entry_id, entryId), eq(chatSwipes.active, true)),
                })
            }

            export const swipeIdList = (entryId: number) => {
                return database.query.chatSwipes.findMany({
                    where: eq(chatSwipes.entry_id, entryId),
                    columns: {
                        id: true,
                    },
                    orderBy: chatSwipes.id,
                })
            }

            export type LiveEntry = NonNullable<Awaited<ReturnType<typeof entry>>>
        }
    }

    export const useBuffer = () => {
        const { buffer } = Chats.useChatState(
            useShallow((state) => ({
                buffer: state.buffer,
            }))
        )
        return { buffer }
    }

    export const useChat = () => {
        const props = useChatState(
            useShallow((state) => ({
                chatId: state.id,
                scrollData: state.scrollData,
                setId: state.setId,
                resetId: state.reset,
            }))
        )
        return props
    }

    const validExtensionTypes = (type: string) => {
        //TODO: Add document, eg application/pdf or text/plain
        return type === 'audio' || type === 'image'
    }
}
