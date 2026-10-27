import type { ChatSummary } from '@db/schema'
import type { ChatMessage } from '@lib/state/chat/types'

// The newest eligible endpoint is the second-latest assistant response, inclusive.
export const summaryCutoff = (messages: ChatMessage[]) =>
    messages
        .filter(
            (message) =>
                !message.is_user &&
                message.swipes.some((swipe) => swipe.active && swipe.swipe.trim())
        )
        .at(-2)?.id

export const usableSummaries = (messages: ChatMessage[], summaries: ChatSummary[]) => {
    return usableSummariesBefore(summaryCutoff(messages), summaries)
}

export const usableSummariesBefore = (cutoff: number | undefined, summaries: ChatSummary[]) => {
    if (cutoff === undefined) return []
    let end = -1
    return [...summaries]
        .sort((a, b) => a.start_entry_id - b.start_entry_id)
        .filter((summary) => {
            if (
                summary.status !== 'accepted' ||
                !summary.enabled ||
                !summary.content.trim() ||
                summary.end_entry_id > cutoff ||
                summary.start_entry_id <= end
            )
                return false
            end = summary.end_entry_id
            return true
        })
}

export const summarizeHistory = (
    messages: ChatMessage[],
    summaries: ChatSummary[]
): ChatMessage[] => {
    const selected = usableSummaries(messages, summaries)
    if (!selected.length) return messages
    const result: ChatMessage[] = []
    let index = 0
    const append = (summary: ChatSummary) =>
        result.push(
            summaryMessage(
                -10_000 - summary.id,
                `[Summary of earlier conversation]\n${summary.content}`
            )
        )
    for (const message of messages) {
        while (index < selected.length && selected[index].end_entry_id < message.id)
            append(selected[index++])
        const summary = selected[index]
        if (summary && message.id >= summary.start_entry_id && message.id <= summary.end_entry_id) {
            // Emit at the end of its range, even when some covered entries were deleted.
            continue
        }
        result.push(message)
    }
    while (index < selected.length) append(selected[index++])
    return result
}

export const summaryMessage = (id: number, text: string, isUser = true): ChatMessage => ({
    id: id,
    chat_id: -1,
    name: '',
    is_user: isUser,
    order: 0,
    swipe_id: 0,
    attachments: [],
    swipes: [
        {
            id: id,
            entry_id: id,
            swipe: text,
            active: true,
            send_date: new Date(),
            gen_started: new Date(),
            gen_finished: new Date(),
            timings: null,
            token_length: null,
            reset_length: null,
        },
    ],
})

export const selectSummarySources = (
    messages: ChatMessage[],
    summaries: ChatSummary[],
    replacesId?: number
) => {
    const cutoff = summaryCutoff(messages)
    if (cutoff === undefined) return []
    const replacement = summaries.find((item) => item.id === replacesId)
    const used = usableSummaries(
        messages,
        summaries.filter((item) => item.id !== replacesId && item.id !== replacement?.replaces_id)
    )
    const eligible = messages.filter(
        (message) =>
            message.id <= cutoff &&
            (!replacement ||
                (message.id >= replacement.start_entry_id &&
                    message.id <= replacement.end_entry_id))
    )
    const selected: ChatMessage[] = []
    for (const message of eligible) {
        const covered = used.some(
            (item) => message.id >= item.start_entry_id && message.id <= item.end_entry_id
        )
        if (covered && selected.length) break
        if (!covered) selected.push(message)
    }
    return selected
}

export const summaryTranscript = (messages: ChatMessage[]) =>
    messages
        .map((message) => {
            const text = message.swipes.find((swipe) => swipe.active)?.swipe ?? ''
            return `${message.is_user ? 'User' : 'Assistant'} (${message.name}): ${text}`
        })
        .join('\n\n')
