import type { ChatSummary } from '@db/schema'

export type CompressionItem = {
    id: number
    kind: 'message' | 'summary'
    position: number
    isUser: boolean
    tokens: number
}
export type CompressionPlan =
    | { kind: 'history'; startEntryId: number; endEntryId: number }
    | { kind: 'consolidation'; summaryIds: number[] }

// Items are chronological and belong only to the current prompt window.
export const selectCompressionPlan = (
    items: CompressionItem[],
    summaries: ChatSummary[],
    options: {
        capacity: number
        used: number
        cutoff?: number
        minimumPercent: number
        maximumCoveragePercent: number
        consolidate: boolean
    }
): CompressionPlan | undefined => {
    const minimum = (options.capacity * options.minimumPercent) / 100
    const rawTokens = items
        .filter((item) => item.kind === 'message')
        .reduce((sum, item) => sum + item.tokens, 0)
    const maximum = (rawTokens * options.maximumCoveragePercent) / 100
    let start: number | undefined
    let tokens = 0
    let end: number | undefined
    for (const item of items) {
        if (item.kind === 'summary') {
            if (start !== undefined) break
            continue
        }
        if (options.cutoff === undefined || item.position > options.cutoff) break
        if (tokens + item.tokens > maximum) break
        start ??= item.position
        tokens += item.tokens
        if (!item.isUser && tokens >= minimum) end = item.position
    }
    if (start !== undefined && end !== undefined)
        return { kind: 'history', startEntryId: start, endEntryId: end }
    const summaryTokens = items
        .filter((item) => item.kind === 'summary')
        .reduce((sum, item) => sum + item.tokens, 0)
    if (!options.consolidate || summaryTokens <= options.used / 2) return
    let group: number[] = []
    let groupTokens = 0
    for (const item of items) {
        const summary =
            item.kind === 'summary'
                ? summaries.find((summary) => summary.id === item.id)
                : undefined
        if (!summary || summary.source_changed) {
            group = []
            groupTokens = 0
            continue
        }
        group.push(summary.id)
        groupTokens += item.tokens
        if (group.length >= 2 && groupTokens >= minimum)
            return { kind: 'consolidation', summaryIds: group }
    }
}
