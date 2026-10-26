import { and, asc, count, desc, eq, getTableColumns, like, lte, sum } from 'drizzle-orm'

import { db as database } from '@db/db'
import { characters, chatAttachments, chatEntries, chats, chatSwipes } from '@db/schema'

import { assertChatEditable, type ChatMutationOptions } from './access'
import type { ChatInput, MessageInput, SwipeInput } from './types'

const live = {
    chat: (chatId: number) =>
        database.query.chats.findFirst({
            where: eq(chats.id, chatId),
            with: {
                messages: {
                    orderBy: asc(chatEntries.id),
                    with: {
                        swipes: { where: eq(chatSwipes.active, true), limit: 1 },
                        attachments: true,
                    },
                },
            },
        }),
    chatList: (characterId: number) =>
        database
            .select({ ...getTableColumns(chats), messageCount: count(chatEntries.id) })
            .from(chats)
            .leftJoin(chatEntries, eq(chats.id, chatEntries.chat_id))
            .where(eq(chats.character_id, characterId))
            .groupBy(chats.id)
            .orderBy(desc(chats.last_modified)),
    messageIds: (chatId: number) =>
        database.query.chatEntries.findMany({
            where: eq(chatEntries.chat_id, chatId),
            columns: { id: true },
            orderBy: desc(chatEntries.id),
        }),
    message: (messageId: number) =>
        database.query.chatEntries.findFirst({
            where: eq(chatEntries.id, messageId),
            with: {
                swipes: { where: eq(chatSwipes.active, true), limit: 1 },
                attachments: true,
            },
        }),
    activeSwipe: (messageId: number) =>
        database.query.chatSwipes.findFirst({
            where: and(eq(chatSwipes.entry_id, messageId), eq(chatSwipes.active, true)),
        }),
    swipeIds: (messageId: number) =>
        database.query.chatSwipes.findMany({
            where: eq(chatSwipes.entry_id, messageId),
            columns: { id: true },
            orderBy: asc(chatSwipes.id),
        }),
    tokenCount: (chatId: number) =>
        database
            .select({ totalTokens: sum(chatSwipes.token_length) })
            .from(chatSwipes)
            .innerJoin(chatEntries, eq(chatSwipes.entry_id, chatEntries.id))
            .where(and(eq(chatEntries.chat_id, chatId), eq(chatSwipes.active, true))),
}

const query = {
    chat: (chatId: number) => live.chat(chatId).sync(),
    chatRow: (chatId: number) =>
        database.query.chats.findFirst({ where: eq(chats.id, chatId) }).sync(),
    chatMetadata: (chatId: number) =>
        database
            .select({
                id: chats.id,
                character_id: chats.character_id,
                user_id: chats.user_id,
                scroll_offset: chats.scroll_offset,
                messageCount: count(chatEntries.id),
            })
            .from(chats)
            .leftJoin(chatEntries, eq(chats.id, chatEntries.chat_id))
            .where(eq(chats.id, chatId))
            .groupBy(chats.id)
            .get(),
    latestChat: (characterId?: number) =>
        database.query.chats
            .findFirst({
                ...(characterId !== undefined && { where: eq(chats.character_id, characterId) }),
                orderBy: desc(chats.last_modified),
            })
            .sync(),
    swipe: (swipeId: number) =>
        database.query.chatSwipes.findFirst({ where: eq(chatSwipes.id, swipeId) }).sync(),
    swipeContext: (swipeId: number) =>
        database
            .select({
                chat_id: chats.id,
                character_id: chats.character_id,
                character_name: characters.name,
            })
            .from(chatSwipes)
            .innerJoin(chatEntries, eq(chatSwipes.entry_id, chatEntries.id))
            .innerJoin(chats, eq(chatEntries.chat_id, chats.id))
            .innerJoin(characters, eq(chats.character_id, characters.id))
            .where(eq(chatSwipes.id, swipeId))
            .get(),
    chatName: (chatId: number) =>
        database.select({ name: chats.name }).from(chats).where(eq(chats.id, chatId)).get()?.name,
    searchResults: (characterId: number, text: string) =>
        database
            .select({
                swipe_id: chatSwipes.id,
                chat_id: chats.id,
                message_id: chatEntries.id,
                chat_name: chats.name,
                swipe: chatSwipes.swipe,
                send_date: chatSwipes.send_date,
            })
            .from(chatEntries)
            .innerJoin(
                chatSwipes,
                and(eq(chatEntries.id, chatSwipes.entry_id), eq(chatSwipes.active, true))
            )
            .innerJoin(chats, eq(chatEntries.chat_id, chats.id))
            .where(and(eq(chats.character_id, characterId), like(chatSwipes.swipe, `%${text}%`)))
            .orderBy(desc(chatSwipes.send_date))
            .limit(100)
            .all(),
    chatCopy: (chatId: number, options: { throughMessageId?: number } = {}) => {
        if (options.throughMessageId !== undefined) {
            const boundary = database.query.chatEntries
                .findFirst({
                    where: and(
                        eq(chatEntries.id, options.throughMessageId),
                        eq(chatEntries.chat_id, chatId)
                    ),
                    columns: { id: true },
                })
                .sync()
            if (!boundary) return undefined
        }
        return database.query.chats
            .findFirst({
                where: eq(chats.id, chatId),
                with: {
                    messages: {
                        ...(options.throughMessageId !== undefined && {
                            where: lte(chatEntries.id, options.throughMessageId),
                        }),
                        orderBy: asc(chatEntries.id),
                        with: { swipes: { orderBy: asc(chatSwipes.id) }, attachments: true },
                    },
                },
            })
            .sync()
    },
    chatAttachments: (chatId: number) =>
        database
            .select(getTableColumns(chatAttachments))
            .from(chatAttachments)
            .innerJoin(chatEntries, eq(chatAttachments.chat_entry_id, chatEntries.id))
            .where(eq(chatEntries.chat_id, chatId))
            .all(),
    messageAttachments: (messageId: number) =>
        database.query.chatAttachments
            .findMany({ where: eq(chatAttachments.chat_entry_id, messageId) })
            .sync(),
}

type Transaction = Parameters<Parameters<typeof database.transaction>[0]>[0]

const touchChat = (tx: Transaction, chatId: number) => {
    const chat = tx.query.chats
        .findFirst({ where: eq(chats.id, chatId), columns: { character_id: true } })
        .sync()
    if (!chat) return
    const now = Date.now()
    tx.update(chats).set({ last_modified: now }).where(eq(chats.id, chatId)).run()
    tx.update(characters)
        .set({ last_modified: now })
        .where(eq(characters.id, chat.character_id))
        .run()
}

const touchMessage = (tx: Transaction, messageId: number) => {
    const message = tx.query.chatEntries
        .findFirst({ where: eq(chatEntries.id, messageId), columns: { chat_id: true } })
        .sync()
    if (message) touchChat(tx, message.chat_id)
}

const insertMessage = (tx: Transaction, chatId: number, input: MessageInput) => {
    const { swipes, attachments = [], ...fields } = input
    // `order` is a required legacy column. Chronology uses the message ID.
    const message = tx
        .insert(chatEntries)
        .values({ ...fields, chat_id: chatId, order: 0 })
        .returning()
        .get()
    const activeIndex = swipes.findIndex((swipe) => swipe.active)
    if (swipes.length)
        tx.insert(chatSwipes)
            .values(
                swipes.map((swipe, index) => ({
                    ...swipe,
                    entry_id: message.id,
                    active: index === activeIndex,
                }))
            )
            .run()
    if (attachments.length)
        tx.insert(chatAttachments)
            .values(
                attachments.map((attachment) => ({
                    ...attachment,
                    chat_entry_id: message.id,
                }))
            )
            .run()
    return message.id
}

const assertMessageEditable = (messageId: number, options: ChatMutationOptions = {}) => {
    const message = database.query.chatEntries
        .findFirst({ where: eq(chatEntries.id, messageId) })
        .sync()
    if (message) assertChatEditable(message.chat_id, options)
}
const assertSwipeEditable = (swipeId: number, options: ChatMutationOptions = {}) => {
    const swipe = query.swipe(swipeId)
    if (swipe) assertMessageEditable(swipe.entry_id, options)
}

const create = {
    chat: (input: ChatInput) =>
        database.transaction((tx) => {
            const { messages = [], ...fields } = input
            const chat = tx.insert(chats).values(fields).returning({ id: chats.id }).get()
            for (const message of messages) insertMessage(tx, chat.id, message)
            touchChat(tx, chat.id)
            return chat.id
        }),
    message: (chatId: number, input: MessageInput, options: ChatMutationOptions = {}) =>
        database.transaction((tx) => {
            assertChatEditable(chatId, options)
            const messageId = insertMessage(tx, chatId, input)
            touchChat(tx, chatId)
            return tx.query.chatEntries
                .findFirst({
                    where: eq(chatEntries.id, messageId),
                    with: { swipes: true, attachments: true },
                })
                .sync()!
        }),
    turn: (
        chatId: number,
        input: { user?: MessageInput; assistant: MessageInput },
        options: ChatMutationOptions = {}
    ) =>
        database.transaction((tx) => {
            assertChatEditable(chatId, options)
            if (input.user) insertMessage(tx, chatId, input.user)
            const messageId = insertMessage(tx, chatId, input.assistant)
            touchChat(tx, chatId)
            return tx.query.chatEntries
                .findFirst({
                    where: eq(chatEntries.id, messageId),
                    with: { swipes: true, attachments: true },
                })
                .sync()!
        }),
    swipe: (
        messageId: number,
        input: Omit<SwipeInput, 'active'>,
        options: ChatMutationOptions = {}
    ) =>
        database.transaction((tx) => {
            assertMessageEditable(messageId, options)
            tx.update(chatSwipes)
                .set({ active: false })
                .where(eq(chatSwipes.entry_id, messageId))
                .run()
            const swipe = tx
                .insert(chatSwipes)
                .values({ ...input, entry_id: messageId, active: true })
                .returning()
                .get()
            touchMessage(tx, messageId)
            return swipe
        }),
}

const update = {
    chat: (
        chatId: number,
        fields: Partial<Pick<typeof chats.$inferInsert, 'name' | 'user_id' | 'scroll_offset'>>,
        options: ChatMutationOptions = {}
    ) => {
        if (fields.name !== undefined || fields.user_id !== undefined)
            assertChatEditable(chatId, options)
        return database.update(chats).set(fields).where(eq(chats.id, chatId)).run()
    },
    chatTimestamp: (chatId: number) => database.transaction((tx) => touchChat(tx, chatId)),
    activeSwipe: (swipeId: number, options: ChatMutationOptions = {}) =>
        database.transaction((tx) => {
            assertSwipeEditable(swipeId, options)
            const swipe = tx.query.chatSwipes
                .findFirst({ where: eq(chatSwipes.id, swipeId) })
                .sync()
            if (!swipe) return false
            tx.update(chatSwipes)
                .set({ active: false })
                .where(eq(chatSwipes.entry_id, swipe.entry_id))
                .run()
            tx.update(chatSwipes).set({ active: true }).where(eq(chatSwipes.id, swipeId)).run()
            return true
        }),
    swipe: (
        swipeId: number,
        fields: Partial<Omit<typeof chatSwipes.$inferInsert, 'id' | 'entry_id' | 'active'>>,
        options: ChatMutationOptions = {}
    ) =>
        database.transaction((tx) => {
            if (Object.keys(fields).some((key) => key !== 'token_length'))
                assertSwipeEditable(swipeId, options)
            const swipe = tx
                .update(chatSwipes)
                .set(fields)
                .where(eq(chatSwipes.id, swipeId))
                .returning()
                .get()
            if (swipe && fields.swipe !== undefined) touchMessage(tx, swipe.entry_id)
            return swipe
        }),
}

const remove = {
    chat: (chatId: number) =>
        database.transaction((tx) => {
            assertChatEditable(chatId)
            touchChat(tx, chatId)
            tx.delete(chats).where(eq(chats.id, chatId)).run()
        }),
    message: (messageId: number) =>
        database.transaction((tx) => {
            assertMessageEditable(messageId)
            touchMessage(tx, messageId)
            tx.delete(chatEntries).where(eq(chatEntries.id, messageId)).run()
        }),
}

export const db = { query: query, live: live, create: create, update: update, delete: remove }
