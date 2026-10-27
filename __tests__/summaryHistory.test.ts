import type { ChatSummary } from '../db/schema'
import {
    selectSummarySources,
    summarizeHistory,
    summaryCutoff,
    summaryMessage,
    summaryTranscript,
} from '../lib/summaries/history'

const message = (id: number, text = `message ${id}`, isUser = id % 2 === 0) => ({
    ...summaryMessage(id, text, isUser),
    name: isUser ? 'Person' : 'Character',
})
const messages = Array.from({ length: 7 }, (_, index) => message(index + 1))
const summary = (
    id: number,
    start: number,
    end: number,
    changes: Partial<ChatSummary> = {}
): ChatSummary => ({
    id,
    chat_id: 1,
    content: `memory ${id}`,
    status: 'accepted',
    enabled: true,
    source_changed: false,
    notice_dismissed: false,
    start_entry_id: start,
    end_entry_id: end,
    eligible_end_id: end,
    attempt_count: 1,
    replaces_id: null,
    error: null,
    created_at: 0,
    ...changes,
})

test('eligibility protects the most recent exchange and includes the second-latest response', () => {
    expect(summaryCutoff(messages)).toBe(5)
    expect(selectSummarySources(messages, []).map((entry) => entry.id)).toEqual([1, 2, 3, 4, 5])
    expect(selectSummarySources([message(1)], [])).toEqual([])
    expect(summaryCutoff([...messages, message(8), message(9, '')])).toBe(5)
})
test('accepted chunks replace covered history in chronological order; drafts and replaced summaries do not', () => {
    const result = summarizeHistory(messages, [
        summary(1, 1, 3),
        summary(2, 4, 5),
        summary(3, 6, 7),
        summary(4, 1, 5, { status: 'draft' }),
    ])
    expect(result.map((entry) => entry.swipes[0].swipe)).toEqual([
        '[Summary of earlier conversation]\nmemory 1',
        '[Summary of earlier conversation]\nmemory 2',
        'message 6',
        'message 7',
    ])
    expect(summarizeHistory(messages, [summary(1, 1, 5, { status: 'replaced' })])).toBe(messages)
})
test('new chunks stop before existing coverage and replacements can regenerate their original range', () => {
    expect(selectSummarySources(messages, [summary(1, 3, 5)]).map((entry) => entry.id)).toEqual([
        1, 2,
    ])
    expect(selectSummarySources(messages, [summary(1, 1, 3)]).map((entry) => entry.id)).toEqual([
        4, 5,
    ])
    const records = [summary(1, 1, 3), summary(2, 1, 3, { status: 'draft', replaces_id: 1 })]
    expect(selectSummarySources(messages, records, 2).map((entry) => entry.id)).toEqual([1, 2, 3])
})
test('transcripts contain participant labels and answer text only', () => {
    const source = message(1)
    source.swipes[0].reasoning = { swipe_id: 1, content: 'private reasoning', reset_length: null }
    source.attachments = [
        {
            id: 1,
            chat_entry_id: 1,
            uri: 'file://image',
            type: 'image',
            mime_type: 'image/png',
            name: 'image',
            size: 100,
        },
    ]
    expect(summaryTranscript([source])).toBe('Assistant (Character): message 1')
})

test('kept summaries retain their chronological position after all covered messages are deleted', () => {
    const remaining = messages.filter((message) => message.id > 3)
    const result = summarizeHistory(remaining, [summary(1, 1, 3)])
    expect(result[0].swipes[0].swipe).toContain('memory 1')
    expect(result.slice(1)).toEqual(remaining)
})

test('replacing a draft can expand its sources while ordinary regeneration keeps the original range', () => {
    const draft = summary(1, 1, 3, { status: 'draft' })
    expect(selectSummarySources(messages, [draft], 1).map((entry) => entry.id)).toEqual([1, 2, 3])
    expect(selectSummarySources(messages, [draft], 1, true).map((entry) => entry.id)).toEqual([
        1, 2, 3, 4, 5,
    ])
    const accepted = summary(2, 4, 5)
    expect(
        selectSummarySources(messages, [draft, accepted], 1, true).map((entry) => entry.id)
    ).toEqual([1, 2, 3])
})
