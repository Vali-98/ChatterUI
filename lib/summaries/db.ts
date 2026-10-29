import {
    and,
    asc,
    count,
    eq,
    getTableColumns,
    gte,
    inArray,
    lte,
    ne,
    sql,
    gt,
    lt,
} from 'drizzle-orm'

import { db } from '@db/db'
import { chatEntries, chatSummaries, chatSwipes, summarySources, summaryInputs } from '@db/schema'
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
        .select({
            ...getTableColumns(chatSummaries),
            sourceCount: count(summarySources.entry_id),
            dependentIds:
                sql<string>`(select json_group_array(${summaryInputs.summary_id}) from ${summaryInputs} where ${summaryInputs.source_summary_id} = ${chatSummaries.id})`.mapWith(
                    (value) => JSON.parse(value) as number[]
                ),
            inputCount: sql<number>`(select count(*) from ${summaryInputs} where ${summaryInputs.summary_id} = ${chatSummaries.id})`,
        })
        .from(chatSummaries)
        .leftJoin(summarySources, eq(summarySources.summary_id, chatSummaries.id))
        .where(eq(chatSummaries.chat_id, chatId))
        .groupBy(chatSummaries.id)
        .orderBy(asc(chatSummaries.start_entry_id), asc(chatSummaries.id))
export const summaryInputList = (id: number) =>
    db
        .select(getTableColumns(chatSummaries))
        .from(summaryInputs)
        .innerJoin(chatSummaries, eq(chatSummaries.id, summaryInputs.source_summary_id))
        .where(eq(summaryInputs.summary_id, id))
        .orderBy(asc(chatSummaries.start_entry_id))

export const dependentSummaryIds = (id: number, tx: Transaction | typeof db = db) => {
    const found = new Set<number>()
    let frontier = [id]
    while (frontier.length) {
        const rows = tx
            .select({ id: summaryInputs.summary_id })
            .from(summaryInputs)
            .where(inArray(summaryInputs.source_summary_id, frontier))
            .all()
        frontier = rows.map((row) => row.id).filter((id) => !found.has(id))
        frontier.forEach((id) => found.add(id))
    }
    return [...found]
}
const invalidateSummaryDependents = (tx: Transaction, id: number) => {
    const ids = dependentSummaryIds(id, tx)
    if (ids.length)
        tx.update(chatSummaries)
            .set({ source_changed: true, notice_dismissed: false })
            .where(inArray(chatSummaries.id, ids))
            .run()
}

const writeConsolidationSources = (tx: Transaction, id: number, chatId: number, ids: number[]) => {
    const sources = tx
        .select()
        .from(chatSummaries)
        .where(inArray(chatSummaries.id, ids))
        .orderBy(asc(chatSummaries.start_entry_id))
        .all()
    if (
        sources.length < 2 ||
        sources.length !== new Set(ids).size ||
        sources.some(
            (source, index) =>
                source.chat_id !== chatId ||
                source.id >= id ||
                !['accepted', 'replaced', 'discarded'].includes(source.status) ||
                !source.content.trim() ||
                (index > 0 && sources[index - 1].end_entry_id >= source.start_entry_id)
        )
    )
        throw new Error('Invalid consolidation sources')
    for (let index = 1; index < sources.length; index++) {
        const gap = tx
            .select({ id: chatEntries.id })
            .from(chatEntries)
            .where(
                and(
                    eq(chatEntries.chat_id, chatId),
                    gt(chatEntries.id, sources[index - 1].end_entry_id),
                    lt(chatEntries.id, sources[index].start_entry_id)
                )
            )
            .limit(1)
            .get()
        if (gap) throw new Error('Consolidation sources must be adjacent in chat history')
    }
    tx.delete(summaryInputs).where(eq(summaryInputs.summary_id, id)).run()
    tx.delete(summarySources).where(eq(summarySources.summary_id, id)).run()
    tx.insert(summaryInputs)
        .values(sources.map((source) => ({ summary_id: id, source_summary_id: source.id })))
        .run()
    // Flatten provenance in SQLite rather than binding one parameter triplet per historical entry.
    tx.insert(summarySources)
        .select(
            tx
                .select({
                    summary_id: sql<number>`${id}`.as('summary_id'),
                    entry_id: summarySources.entry_id,
                    swipe_id: summarySources.swipe_id,
                })
                .from(summarySources)
                .where(inArray(summarySources.summary_id, ids))
        )
        .onConflictDoNothing()
        .run()
    return tx
        .update(chatSummaries)
        .set({
            start_entry_id: sources[0].start_entry_id,
            end_entry_id: sources.at(-1)!.end_entry_id,
            source_changed: sources.some((source) => source.source_changed),
            content: '',
            error: null,
            notice_dismissed: false,
        })
        .where(eq(chatSummaries.id, id))
        .returning()
        .get()
}
export const createConsolidationDraft = (chatId: number, ids: number[], replacesId?: number) =>
    db.transaction((tx) => {
        const draft = tx
            .insert(chatSummaries)
            .values({
                chat_id: chatId,
                kind: 'consolidation',
                start_entry_id: 0,
                end_entry_id: 0,
                replaces_id: replacesId,
            })
            .returning()
            .get()
        return writeConsolidationSources(tx, draft.id, chatId, ids)
    })
export const resetConsolidationDraft = (id: number, ids: number[]) =>
    db.transaction((tx) => {
        const draft = tx.select().from(chatSummaries).where(eq(chatSummaries.id, id)).get()
        if (!draft || draft.status !== 'draft' || draft.kind !== 'consolidation')
            throw new Error('No consolidation draft')
        return writeConsolidationSources(tx, id, draft.chat_id, ids)
    })
export const restrictConsolidationSources = (id: number, ids: number[]) =>
    db.transaction((tx) => {
        const draft = tx.select().from(chatSummaries).where(eq(chatSummaries.id, id)).get()!
        const content = draft.content
        writeConsolidationSources(tx, id, draft.chat_id, ids)
        tx.update(chatSummaries).set({ content }).where(eq(chatSummaries.id, id)).run()
    })

export const summaryIdentity = (id: number) =>
    db.select({ id: chatSummaries.id }).from(chatSummaries).where(eq(chatSummaries.id, id))
export const getSummary = (id: number) =>
    db.select().from(chatSummaries).where(eq(chatSummaries.id, id)).get()
export const updateSummary = (
    id: number,
    fields: Partial<
        Pick<
            typeof chatSummaries.$inferInsert,
            'content' | 'status' | 'source_changed' | 'notice_dismissed' | 'error'
        >
    >
) =>
    db.transaction((tx) => {
        const old = tx.select().from(chatSummaries).where(eq(chatSummaries.id, id)).get()
        const result = tx.update(chatSummaries).set(fields).where(eq(chatSummaries.id, id)).run()
        if (fields.content !== undefined && fields.content !== old?.content)
            invalidateSummaryDependents(tx, id)
        return result
    })

export const createSummaryDraft = (chatId: number, messages: ChatMessage[], replacesId?: number) =>
    db.transaction((tx) => {
        if (!messages.length) throw new Error('No eligible history to summarize')
        const draft = tx
            .insert(chatSummaries)
            .values({
                chat_id: chatId,
                start_entry_id: messages[0].id,
                end_entry_id: messages.at(-1)!.id,
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
        if (
            !summary ||
            !(content ?? summary.content).trim() ||
            !['draft', 'accepted'].includes(summary.status)
        )
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
        tx.update(chatSummaries)
            .set({ status: 'replaced', notice_dismissed: true })
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
            .set({ status: 'replaced', notice_dismissed: true })
            .where(
                and(
                    eq(chatSummaries.chat_id, summary.chat_id),
                    ne(chatSummaries.id, id),
                    eq(chatSummaries.status, 'draft'),
                    gte(chatSummaries.start_entry_id, summary.start_entry_id),
                    lte(chatSummaries.end_entry_id, summary.end_entry_id)
                )
            )
            .run()
        if (content !== undefined && content !== summary.content)
            invalidateSummaryDependents(tx, id)
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

export const deleteSummary = (id: number) =>
    db.transaction((tx) => {
        const dependents = dependentSummaryIds(id, tx)
        invalidateSummaryDependents(tx, id)
        if (dependents.length)
            return tx
                .update(chatSummaries)
                .set({ status: 'discarded', notice_dismissed: true })
                .where(eq(chatSummaries.id, id))
                .run()
        return tx.delete(chatSummaries).where(eq(chatSummaries.id, id)).run()
    })
