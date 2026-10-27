import { and, asc, eq, gt, isNull, or, sql } from 'drizzle-orm'

import { db } from '@db/db'
import {
    authorNotes,
    chatEntries,
    chatSwipes,
    lorebookEntries,
    lorebooks,
    swipeReasoning,
} from '@db/schema'

// Read lengths and cached counts, not entire message bodies, for the live allocation estimate.
export const contextHistory = (chatId: number) =>
    db
        .select({
            id: chatEntries.id,
            is_user: chatEntries.is_user,
            name: chatEntries.name,
            token_length: chatSwipes.token_length,
            content_length: sql<number>`length(${chatSwipes.swipe})`,
            has_content: sql<number>`length(trim(${chatSwipes.swipe})) > 0`,
            reasoning_length: sql<number>`coalesce(length(${swipeReasoning.content}), 0)`,
        })
        .from(chatEntries)
        .innerJoin(
            chatSwipes,
            and(eq(chatEntries.id, chatSwipes.entry_id), eq(chatSwipes.active, true))
        )
        .leftJoin(swipeReasoning, eq(swipeReasoning.swipe_id, chatSwipes.id))
        .where(eq(chatEntries.chat_id, chatId))
        .orderBy(asc(chatEntries.id))

export const contextAuthorNotes = (chatId?: number, characterId?: number) =>
    db
        .select()
        .from(authorNotes)
        .where(
            and(
                eq(authorNotes.active, true),
                or(
                    and(isNull(authorNotes.chat_id), isNull(authorNotes.character_id)),
                    chatId === undefined ? undefined : eq(authorNotes.chat_id, chatId),
                    characterId === undefined
                        ? undefined
                        : eq(authorNotes.character_id, characterId)
                )
            )
        )

export const contextLorebooks = () =>
    db
        .select({ id: lorebooks.id, name: lorebooks.name, token_budget: lorebooks.token_budget })
        .from(lorebooks)
        .innerJoin(
            lorebookEntries,
            and(eq(lorebookEntries.lorebook_id, lorebooks.id), eq(lorebookEntries.enable, true))
        )
        .where(and(eq(lorebooks.active, true), gt(lorebooks.token_budget, 0)))
        .groupBy(lorebooks.id)
