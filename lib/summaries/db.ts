import { and, asc, count, eq, getTableColumns, gte, inArray, lte, ne } from 'drizzle-orm'

import { db } from '@db/db'
import { chatEntries, chatSummaries, chatSwipes, summarySources } from '@db/schema'
import type { ChatMessage } from '@lib/state/chat/types'

type Transaction = Parameters<Parameters<typeof db.transaction>[0]>[0]

export const summaryList = (chatId: number) =>
    db
        .select()
        .from(chatSummaries)
        .where(eq(chatSummaries.chat_id, chatId))
        .orderBy(asc(chatSummaries.start_entry_id), asc(chatSummaries.id))
export const summaryManagerList = (chatId: number) =>
    db
        .select({ ...getTableColumns(chatSummaries), sourceCount: count(summarySources.entry_id) })
        .from(chatSummaries)
        .leftJoin(summarySources, eq(summarySources.summary_id, chatSummaries.id))
        .where(eq(chatSummaries.chat_id, chatId))
        .groupBy(chatSummaries.id)
        .orderBy(asc(chatSummaries.start_entry_id), asc(chatSummaries.id))
export const summaryIdentity = (id: number) =>
    db.select({ id: chatSummaries.id }).from(chatSummaries).where(eq(chatSummaries.id, id))
export const getSummary = (id: number) =>
    db.select().from(chatSummaries).where(eq(chatSummaries.id, id)).get()
export const updateSummary = (
    id: number,
    fields: Partial<
        Pick<
            typeof chatSummaries.$inferInsert,
            | 'content'
            | 'status'
            | 'enabled'
            | 'source_changed'
            | 'notice_dismissed'
            | 'attempt_count'
            | 'error'
        >
    >
) => db.update(chatSummaries).set(fields).where(eq(chatSummaries.id, id)).run()

export const createSummaryDraft = (chatId: number, messages: ChatMessage[], replacesId?: number) =>
    db.transaction((tx) => {
        if (!messages.length) throw new Error('No eligible history to summarize')
        const draft = tx
            .insert(chatSummaries)
            .values({
                chat_id: chatId,
                start_entry_id: messages[0].id,
                end_entry_id: messages.at(-1)!.id,
                eligible_end_id: messages.at(-1)!.id,
                replaces_id: replacesId,
            })
            .returning()
            .get()
        tx.insert(summarySources)
            .values(
                messages.map((message) => {
                    const swipe = message.swipes.find((item) => item.active)
                    if (!swipe) throw new Error('Summary source has no active swipe')
                    return { summary_id: draft.id, entry_id: message.id, swipe_id: swipe.id }
                })
            )
            .run()
        return draft
    })

export const restrictSummarySources = (id: number, messages: ChatMessage[]) =>
    db.transaction((tx) => {
        const ids = new Set(messages.map((message) => message.id))
        const sources = tx
            .select()
            .from(summarySources)
            .where(eq(summarySources.summary_id, id))
            .all()
        for (const source of sources)
            if (!ids.has(source.entry_id))
                tx.delete(summarySources)
                    .where(
                        and(
                            eq(summarySources.summary_id, id),
                            eq(summarySources.entry_id, source.entry_id)
                        )
                    )
                    .run()
        tx.update(chatSummaries)
            .set({ start_entry_id: messages[0].id, end_entry_id: messages.at(-1)!.id })
            .where(eq(chatSummaries.id, id))
            .run()
    })

// Called inside the same transaction as the source mutation, including while a draft runs.
export const invalidateSummarySources = (
    tx: Transaction,
    entryId: number,
    activeSwipeId?: number
) => {
    const affected = tx
        .select({ id: summarySources.summary_id })
        .from(summarySources)
        .where(
            and(
                eq(summarySources.entry_id, entryId),
                activeSwipeId === undefined ? undefined : ne(summarySources.swipe_id, activeSwipeId)
            )
        )
        .all()
    if (affected.length)
        tx.update(chatSummaries)
            .set({ source_changed: true, notice_dismissed: false })
            .where(
                inArray(
                    chatSummaries.id,
                    affected.map((item) => item.id)
                )
            )
            .run()
}

export const acceptSummary = (
    id: number,
    options: { content?: string; requireUnchanged?: boolean } = {}
) =>
    db.transaction((tx) => {
        const summary = tx.select().from(chatSummaries).where(eq(chatSummaries.id, id)).get()
        const content = options.content
        if (options.requireUnchanged && summary?.source_changed)
            throw new Error('Source history changed during summarization')
        if (!summary || !(content ?? summary.content).trim() || summary.status === 'discarded')
            throw new Error('Summary cannot be accepted')
        // Keeping/editing acknowledges the current active swipes. Future switches must still invalidate it.
        const current = tx
            .select({ entry_id: chatEntries.id, swipe_id: chatSwipes.id })
            .from(chatEntries)
            .innerJoin(
                chatSwipes,
                and(eq(chatSwipes.entry_id, chatEntries.id), eq(chatSwipes.active, true))
            )
            .where(
                and(
                    eq(chatEntries.chat_id, summary.chat_id),
                    inArray(
                        chatEntries.id,
                        tx
                            .select({ id: summarySources.entry_id })
                            .from(summarySources)
                            .where(eq(summarySources.summary_id, id))
                    )
                )
            )
            .all()
        for (const source of current)
            tx.update(summarySources)
                .set({ swipe_id: source.swipe_id })
                .where(
                    and(
                        eq(summarySources.summary_id, id),
                        eq(summarySources.entry_id, source.entry_id)
                    )
                )
                .run()
        if (summary.enabled)
            tx.update(chatSummaries)
                .set({ enabled: false })
                .where(
                    and(
                        eq(chatSummaries.chat_id, summary.chat_id),
                        ne(chatSummaries.id, id),
                        eq(chatSummaries.status, 'accepted'),
                        lte(chatSummaries.start_entry_id, summary.end_entry_id),
                        gte(chatSummaries.end_entry_id, summary.start_entry_id)
                    )
                )
                .run()
        tx.update(chatSummaries)
            .set({
                content: content ?? summary.content,
                status: 'accepted',
                source_changed: false,
                notice_dismissed: false,
                error: null,
            })
            .where(eq(chatSummaries.id, id))
            .run()
    })

export const resetSummaryDraft = (id: number, messages: ChatMessage[]) =>
    db.transaction((tx) => {
        const summary = tx.select().from(chatSummaries).where(eq(chatSummaries.id, id)).get()
        if (!summary || summary.status !== 'draft' || !messages.length)
            throw new Error('No draft to regenerate')
        tx.delete(summarySources).where(eq(summarySources.summary_id, id)).run()
        tx.insert(summarySources)
            .values(
                messages.map((message) => ({
                    summary_id: id,
                    entry_id: message.id,
                    swipe_id: message.swipes.find((swipe) => swipe.active)!.id,
                }))
            )
            .run()
        return tx
            .update(chatSummaries)
            .set({
                content: '',
                attempt_count: 0,
                eligible_end_id: Math.max(summary.eligible_end_id, messages.at(-1)!.id),
                error: null,
                source_changed: false,
                notice_dismissed: false,
                start_entry_id: messages[0].id,
                end_entry_id: messages.at(-1)!.id,
            })
            .where(eq(chatSummaries.id, id))
            .returning()
            .get()
    })
