import { and, asc, count, desc, eq, getTableColumns, like, lte, sql } from 'drizzle-orm'

import { db as database } from '@db/db'
import {
    characters,
    chatAttachments,
    chatEntries,
    chats,
    chatSwipes,
    swipeReasoning,
} from '@db/schema'
import { splitReasoning } from '@lib/engine/reasoning/parser'
import { invalidateSummarySources } from '@lib/summaries/db'

import { assertChatEditable, type ChatMutationOptions } from './access'
import type {
    Chat,
    ChatInput,
    MessageInput,
    SwipeInput,
    AttachmentInput,
    EditMessageInput,
} from './types'

const live = {
    chat: (chatId: number, options: { includeReasoning?: boolean } = {}) =>
        database.query.chats.findFirst({
            where: eq(chats.id, chatId),
            with: {
                messages: {
                    orderBy: asc(chatEntries.id),
                    with: {
                        swipes: {
                            where: eq(chatSwipes.active, true),
                            limit: 1,
                            with: { reasoning: options.includeReasoning ? true : undefined },
                        },
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
                swipes: { where: eq(chatSwipes.active, true), limit: 1, with: { reasoning: true } },
                attachments: true,
            },
        }),
    activeSwipe: (messageId: number) =>
        database.query.chatSwipes.findFirst({
            where: and(eq(chatSwipes.entry_id, messageId), eq(chatSwipes.active, true)),
            with: { reasoning: true },
        }),
    swipeIds: (messageId: number) =>
        database.query.chatSwipes.findMany({
            where: eq(chatSwipes.entry_id, messageId),
            columns: { id: true },
            orderBy: asc(chatSwipes.id),
        }),
    tokenCount: (chatId: number) =>
        database
            .select({
                totalTokens: sql<string>`coalesce(sum(coalesce(${chatSwipes.token_length}, (length(${chatSwipes.swipe}) + 3) / 4)), 0)`,
            })
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
    reasoning: (swipeId: number) =>
        database.query.swipeReasoning
            .findFirst({ where: eq(swipeReasoning.swipe_id, swipeId) })
            .sync(),
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
    chatCopy: (chatId: number, options: { throughMessageId?: number } = {}): Chat | undefined => {
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
                        with: {
                            swipes: { orderBy: asc(chatSwipes.id), with: { reasoning: true } },
                            attachments: true,
                        },
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

const writeReasoning = (
    tx: Transaction,
    swipeId: number,
    content: string | null | undefined,
    resetLength?: number | null
) => {
    if (content === undefined) return
    if (!content) {
        tx.delete(swipeReasoning).where(eq(swipeReasoning.swipe_id, swipeId)).run()
        return
    }
    tx.insert(swipeReasoning)
        .values({ swipe_id: swipeId, content: content, reset_length: resetLength })
        .onConflictDoUpdate({
            target: swipeReasoning.swipe_id,
            set: { content, ...(resetLength !== undefined && { reset_length: resetLength }) },
        })
        .run()
}

const insertSwipe = (tx: Transaction, messageId: number, input: SwipeInput, normalize: boolean) => {
    const { reasoning, ...fields } = input
    const parsed =
        normalize && reasoning === undefined ? splitReasoning(fields.swipe ?? '') : undefined
    const swipe = tx
        .insert(chatSwipes)
        .values({ ...fields, swipe: parsed?.text ?? fields.swipe, entry_id: messageId })
        .returning()
        .get()
    writeReasoning(tx, swipe.id, reasoning?.content ?? parsed?.reasoning, reasoning?.reset_length)
    return swipe
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
    for (const [index, swipe] of swipes.entries())
        insertSwipe(tx, message.id, { ...swipe, active: index === activeIndex }, !input.is_user)
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
            invalidateSummarySources(tx, messageId)
            const owner = tx.query.chatEntries
                .findFirst({ where: eq(chatEntries.id, messageId) })
                .sync()
            const swipe = insertSwipe(tx, messageId, { ...input, active: true }, !owner?.is_user)
            touchMessage(tx, messageId)
            return swipe
        }),
}

const update = {
    message: (
        messageId: number,
        input: Omit<EditMessageInput, 'attachmentUris'> & { attachments: AttachmentInput[] }
    ) =>
        database.transaction((tx) => {
            const message = tx.query.chatEntries
                .findFirst({ where: eq(chatEntries.id, messageId) })
                .sync()
            const swipe = tx.query.chatSwipes
                .findFirst({ where: eq(chatSwipes.id, input.swipeId) })
                .sync()
            if (!message || !swipe || swipe.entry_id !== messageId || !swipe.active)
                throw new Error('The message or active swipe has changed')
            assertChatEditable(message.chat_id)
            const previous = tx.query.chatAttachments
                .findMany({ where: eq(chatAttachments.chat_entry_id, messageId) })
                .sync()
            const retained = new Set(input.retainedAttachmentIds)
            if (input.retainedAttachmentIds.some((id) => !previous.some((item) => item.id === id)))
                throw new Error('A retained attachment no longer exists')
            const removed = previous.filter((item) => !retained.has(item.id))
            for (const item of removed)
                tx.delete(chatAttachments).where(eq(chatAttachments.id, item.id)).run()
            if (input.attachments.length)
                tx.insert(chatAttachments)
                    .values(
                        input.attachments.map((item) => ({ ...item, chat_entry_id: messageId }))
                    )
                    .run()
            if (swipe.swipe !== input.text) {
                tx.update(chatSwipes)
                    .set({ swipe: input.text, reset_length: input.text.length, token_length: null })
                    .where(eq(chatSwipes.id, input.swipeId))
                    .run()
            }
            const reasoning = tx.query.swipeReasoning
                .findFirst({ where: eq(swipeReasoning.swipe_id, input.swipeId) })
                .sync()
            if ((reasoning?.content ?? '') !== input.reasoning)
                writeReasoning(tx, input.swipeId, input.reasoning, input.reasoning.length)
            if (removed.length || input.attachments.length) {
                tx.update(chatSwipes)
                    .set({ token_length: null })
                    .where(eq(chatSwipes.entry_id, messageId))
                    .run()
            }
            if (swipe.swipe !== input.text || removed.length || input.attachments.length)
                invalidateSummarySources(tx, messageId)
            touchChat(tx, message.chat_id)
            return removed
        }),
    chat: (
        chatId: number,
        fields: Partial<Pick<typeof chats.$inferInsert, 'name' | 'user_id' | 'scroll_offset'>>,
        options: ChatMutationOptions = {}
    ) => {
        if (fields.user_id !== undefined) assertChatEditable(chatId, options)
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
            if (!swipe.active) invalidateSummarySources(tx, swipe.entry_id, swipeId)
            tx.update(chatSwipes)
                .set({ active: false })
                .where(eq(chatSwipes.entry_id, swipe.entry_id))
                .run()
            tx.update(chatSwipes).set({ active: true }).where(eq(chatSwipes.id, swipeId)).run()
            return true
        }),
    swipe: (
        swipeId: number,
        fields: Partial<Omit<typeof chatSwipes.$inferInsert, 'id' | 'entry_id' | 'active'>> & {
            reasoning?: string | null
            resetReasoningLength?: number | null
        },
        options: ChatMutationOptions = {}
    ) =>
        database.transaction((tx) => {
            if (Object.keys(fields).some((key) => key !== 'token_length'))
                assertSwipeEditable(swipeId, options)
            const previous =
                fields.swipe !== undefined
                    ? tx.query.chatSwipes.findFirst({ where: eq(chatSwipes.id, swipeId) }).sync()
                    : undefined
            const { reasoning, resetReasoningLength, ...columns } = fields
            const swipe = Object.keys(columns).length
                ? tx
                      .update(chatSwipes)
                      .set(columns)
                      .where(eq(chatSwipes.id, swipeId))
                      .returning()
                      .get()
                : tx.query.chatSwipes.findFirst({ where: eq(chatSwipes.id, swipeId) }).sync()
            if (swipe?.active && fields.swipe !== undefined && previous?.swipe !== fields.swipe)
                invalidateSummarySources(tx, swipe.entry_id)
            if (swipe) writeReasoning(tx, swipeId, reasoning, resetReasoningLength)
            if (swipe && (fields.swipe !== undefined || reasoning !== undefined))
                touchMessage(tx, swipe.entry_id)
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
            invalidateSummarySources(tx, messageId)
            tx.delete(chatEntries).where(eq(chatEntries.id, messageId)).run()
        }),
}

export const db = { query: query, live: live, create: create, update: update, delete: remove }
