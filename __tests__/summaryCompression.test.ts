import { selectCompressionPlan, type CompressionItem } from '../lib/summaries/compression'
import type { ChatSummary } from '../db/schema'
const options = {
    capacity: 1000,
    used: 800,
    cutoff: 4,
    minimumPercent: 10,
    maximumCoveragePercent: 50,
    consolidate: false,
}
const messages: CompressionItem[] = Array.from({ length: 6 }, (_, i) => ({
    id: i + 1,
    position: i + 1,
    kind: 'message',
    isUser: i % 2 === 0,
    tokens: 100,
}))
const summaries = [1, 2, 3].map((id) => ({ id, source_changed: false })) as ChatSummary[]
const memories: CompressionItem[] = summaries.map((summary) => ({
    id: summary.id,
    position: summary.id,
    kind: 'summary',
    isUser: true,
    tokens: 250,
}))
test('coverage counts protected recent history but selects an oldest whole-turn prefix', () => {
    expect(selectCompressionPlan(messages, [], options)).toEqual({
        kind: 'history',
        startEntryId: 1,
        endEntryId: 2,
    })
    expect(selectCompressionPlan(messages, [], { ...options, minimumPercent: 35 })).toBeUndefined()
})
test('a first turn exceeding the cap is left intact', () => {
    expect(
        selectCompressionPlan([{ ...messages[0], tokens: 500 }, messages[1]], [], options)
    ).toBeUndefined()
})
test('consolidation is opt-in and consumes adjacent older summaries when summaries dominate', () => {
    expect(selectCompressionPlan(memories, summaries, options)).toBeUndefined()
    expect(selectCompressionPlan(memories, summaries, { ...options, consolidate: true })).toEqual({
        kind: 'consolidation',
        summaryIds: [1, 2],
    })
    expect(
        selectCompressionPlan(
            memories.map((item) => ({ ...item, tokens: 50 })),
            summaries,
            { ...options, consolidate: true }
        )
    ).toBeUndefined()
})
test('consolidation never bridges uncovered messages or a stale summary', () => {
    const separated = [memories[0], messages[0], memories[1]]
    expect(
        selectCompressionPlan(separated, summaries, { ...options, consolidate: true, cutoff: 0 })
    ).toBeUndefined()
    expect(
        selectCompressionPlan(
            memories.slice(0, 2),
            [{ ...summaries[0], source_changed: true }, summaries[1]],
            { ...options, consolidate: true }
        )
    ).toBeUndefined()
})
