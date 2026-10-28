import type { ChatSummary } from '@db/schema'
import { Chats, type ChatMessage } from '@lib/state/chat'
import { summaryMessage, usableSummariesBefore } from '@lib/summaries/history'

// Capture the latest turn for continuation overrides; size older reads from metadata.
const CAPTURE_SIZE = 2
const METADATA_BATCH_SIZE = 128
type HistoryHint = ReturnType<typeof Chats.db.query.historyHints>[number]

export const captureHistory = (chatId: number, includeReasoning: boolean) => {
    const messages = Chats.db.live
        .historyPage(chatId, { limit: CAPTURE_SIZE, includeReasoning })
        .sync()
        .reverse() as ChatMessage[]
    const throughId = messages.at(-1)?.id ?? 0
    return {
        messages,
        history: {
            throughId,
            cutoff: Chats.db.query.historyCutoff(chatId, throughId),
            // Reuse fetched values across preparation and deferred title generation.
            snapshots: new Map(messages.map((message) => [message.id, message])),
        },
    }
}
export type GenerationHistory = ReturnType<typeof captureHistory>['history']

export const generationHistoryCutoff = (
    chatId: number,
    history: GenerationHistory,
    messages: ChatMessage[]
) => {
    const cleared = messages
        .filter(
            (message) =>
                !message.is_user &&
                !message.swipes.some((swipe) => swipe.active && swipe.swipe.trim()) &&
                history.snapshots
                    .get(message.id)
                    ?.swipes.some((swipe) => swipe.active && swipe.swipe.trim())
        )
        .map((message) => message.id)
    return cleared.length
        ? Chats.db.query.historyCutoff(chatId, history.throughId, cleared)
        : history.cutoff
}

export const createHistoryReader = ({
    chatId,
    history,
    messages,
    includeReasoning,
    summaries,
    estimateOverhead = () => 0,
}: {
    chatId: number
    history: GenerationHistory
    messages: ChatMessage[]
    includeReasoning: boolean
    summaries: ChatSummary[]
    estimateOverhead?: (hint: HistoryHint) => number
}) => {
    const selected = usableSummariesBefore(
        generationHistoryCutoff(chatId, history, messages),
        summaries
    )
    // In-memory continuations/regenerations override the persisted active swipe.
    const overrides = new Map(messages.map((message) => [message.id, message]))
    let beforeId: number | undefined
    let exhausted = false
    const summaryTokens: Record<number, { summarizedMessages: number; rawHistory: number }> = {}
    const read = (remainingTokens = Infinity): ChatMessage[] => {
        if (exhausted) return []
        const hints = Chats.db.query.historyHints(chatId, {
            throughId: history.throughId,
            beforeId,
            limit: METADATA_BATCH_SIZE,
            includeReasoning,
            excludeRanges: selected,
        })
        const candidates: { position: number; hint: HistoryHint; summary?: ChatSummary }[] = [
            ...hints.map((hint) => {
                const message = overrides.get(hint.id) ?? history.snapshots.get(hint.id)
                if (!message) return { position: hint.id, hint }
                const swipe = message.swipes.find((swipe) => swipe.active)
                return {
                    position: hint.id,
                    hint: {
                        ...hint,
                        tokens:
                            (swipe?.token_length ?? Math.ceil((swipe?.swipe.length ?? 0) / 4)) +
                            (includeReasoning
                                ? Math.ceil((swipe?.reasoning?.content.length ?? 0) / 4)
                                : 0),
                        imageTokens:
                            message.attachments.filter((item) => item.type === 'image').length *
                            512,
                    },
                }
            }),
            ...selected
                .filter((summary) => beforeId === undefined || summary.end_entry_id < beforeId)
                .map((summary) => ({
                    position: summary.end_entry_id,
                    hint: {
                        id: -10_000 - summary.id,
                        is_user: true,
                        tokens: Math.ceil(
                            `[Summary of earlier conversation]\n${summary.content}`.length / 4
                        ),
                        nameTokens: 0,
                        imageTokens: 0,
                    },
                    summary,
                })),
        ].sort((a, b) => b.position - a.position)
        let estimatedTokens = 0
        const window: typeof candidates = []
        for (const candidate of candidates) {
            window.push(candidate)
            estimatedTokens += Math.max(
                1,
                candidate.hint.tokens +
                    candidate.hint.imageTokens +
                    estimateOverhead(candidate.hint)
            )
            // Include the boundary item so actual tokenization can decide whether it fits.
            if (estimatedTokens >= remainingTokens || window.length >= METADATA_BATCH_SIZE) break
        }
        const entryIds = window.filter((item) => !item.summary).map((item) => item.hint.id)
        const rows = entryIds.length
            ? (Chats.db.live
                  .historyPage(chatId, {
                      throughId: history.throughId,
                      entryIds,
                      limit: entryIds.length,
                      includeReasoning,
                  })
                  .sync() as ChatMessage[])
            : []
        for (const row of rows)
            if (!history.snapshots.has(row.id)) history.snapshots.set(row.id, row)
        const result: ChatMessage[] = []
        for (const candidate of window) {
            const summary = candidate.summary
            if (summary) {
                const stats = Chats.db.query.historyStats(chatId, {
                    throughId: summary.end_entry_id,
                    fromId: summary.start_entry_id,
                })
                summaryTokens[candidate.hint.id] = {
                    summarizedMessages: stats.messageCount,
                    rawHistory: stats.tokens,
                }
                result.push(
                    summaryMessage(
                        candidate.hint.id,
                        `[Summary of earlier conversation]\n${summary.content}`
                    )
                )
            } else {
                const message =
                    overrides.get(candidate.hint.id) ?? history.snapshots.get(candidate.hint.id)
                if (message) result.push(message)
            }
        }
        beforeId = window.at(-1)?.position
        exhausted = window.length === candidates.length && hints.length < METADATA_BATCH_SIZE
        return result.reverse()
    }
    return { read, summaryTokens }
}
