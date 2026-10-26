import { and, eq, gt } from 'drizzle-orm'

import { splitReasoning } from '@lib/engine/reasoning/parser'

import type { db as database } from './db'
import { chatEntries, chatSwipes, swipeReasoning } from './schema'

// One transaction makes a failed conversion safe to retry. Bound each read for large histories.
export const migrateSwipeReasoning = (db: typeof database) =>
    db.transaction((tx) => {
        let afterId = 0
        while (true) {
            const rows = tx
                .select({ id: chatSwipes.id, swipe: chatSwipes.swipe })
                .from(chatSwipes)
                .innerJoin(chatEntries, eq(chatEntries.id, chatSwipes.entry_id))
                .where(and(eq(chatEntries.is_user, false), gt(chatSwipes.id, afterId)))
                .orderBy(chatSwipes.id)
                .limit(200)
                .all()
            if (!rows.length) break
            for (const row of rows) {
                const result = splitReasoning(row.swipe)
                if (result.text === row.swipe) continue
                const existing = tx.query.swipeReasoning
                    .findFirst({ where: eq(swipeReasoning.swipe_id, row.id) })
                    .sync()
                if (result.reasoning) {
                    const content = existing?.content
                        ? `${existing.content}\n\n${result.reasoning}`
                        : result.reasoning
                    tx.insert(swipeReasoning)
                        .values({ swipe_id: row.id, content: content })
                        .onConflictDoUpdate({
                            target: swipeReasoning.swipe_id,
                            set: { content: content, reset_length: null },
                        })
                        .run()
                } else if (existing) {
                    tx.update(swipeReasoning)
                        .set({ reset_length: null })
                        .where(eq(swipeReasoning.swipe_id, row.id))
                        .run()
                }
                tx.update(chatSwipes)
                    .set({ swipe: result.text, token_length: null, reset_length: null })
                    .where(eq(chatSwipes.id, row.id))
                    .run()
            }
            afterId = rows[rows.length - 1].id
        }
    })
