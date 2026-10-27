import { thinkTags } from '@lib/markdown/ThinkTags'

const reasoningTags = thinkTags.map((tag) => ({
    open: new RegExp(tag.open.source, 'i'),
    close: tag.close,
}))
const openingPrefixes = thinkTags.map((tag) => tag.prefix)
const cleanSpeechText = (text: string) =>
    text
        .replace(/!\[[^\]]*\]\([^)]*\)/g, '')
        .replace(/\[([^\]]+)\]\([^)]*\)/g, '$1')
        .replace(/\[\^[^\]]*\]/g, '')
        .replace(/https?:\/\/\S+/g, '')
        .replace(/(^|\n)\s*(?:#{1,6}\s+|[-*+>]\s+)/g, '$1')
        .replace(/[*_`~]/g, '')
        .replace(/&amp;/g, '&')
        .replace(/&quot;/g, '"')
        .replace(/&apos;/g, "'")
        .replace(/&lt;/g, '<')
        .replace(/&gt;/g, '>')
        .replace(/\s+/g, ' ')
        .trim()

// Keep partial tags/fences across chunks. Reasoning and fenced code never enter speech text.
export const createSpeechTextStream = (maxChunkLength = 1000) => {
    let pending = ''
    let visible = ''
    let hiddenClose: string | undefined
    let skippingUrlTail = false
    const chunks = (text: string) => {
        const output: string[] = []
        let remaining = cleanSpeechText(text)
        while (remaining.length > maxChunkLength) {
            let end = remaining.lastIndexOf(' ', maxChunkLength)
            if (end < Math.floor(maxChunkLength / 2)) end = maxChunkLength
            if (/[\uD800-\uDBFF]/.test(remaining[end - 1])) end--
            output.push(remaining.slice(0, end))
            remaining = remaining.slice(end).trimStart()
        }
        if (remaining) output.push(remaining)
        return output
    }
    const filter = (final: boolean) => {
        while (pending) {
            if (hiddenClose) {
                const end = pending.toLowerCase().indexOf(hiddenClose.toLowerCase())
                if (end === -1) {
                    pending = final ? '' : pending.slice(-Math.max(0, hiddenClose.length - 1))
                    break
                }
                pending = pending.slice(end + hiddenClose.length)
                hiddenClose = undefined
                visible += ' '
                continue
            }
            if (pending.startsWith('`')) {
                if (!final && /^`{1,2}$/.test(pending)) break
                if (pending.startsWith('```')) {
                    hiddenClose = '```'
                    pending = pending.slice(3)
                    continue
                }
                pending = pending.slice(1)
                continue
            }
            if (pending.startsWith('<')) {
                const tag = reasoningTags.find((item) => item.open.test(pending))
                if (tag) {
                    const match = pending.match(tag.open)!
                    hiddenClose = tag.close
                    pending = pending.slice(match[0].length)
                    continue
                }
                if (openingPrefixes.some((prefix) => prefix.startsWith(pending.toLowerCase()))) {
                    if (final) pending = ''
                    break
                }
                const end = pending.indexOf('>')
                if (end !== -1) {
                    pending = pending.slice(end + 1)
                    continue
                }
                if (!final && pending.length < 256 && /^<[\w/|:]*\s?/.test(pending)) break
                if (final && /^<[\w/|:]/.test(pending)) {
                    pending = ''
                    break
                }
            }
            const next = pending.slice(1).search(/[<`]/)
            const length = next === -1 ? pending.length : next + 1
            visible += pending.slice(0, length)
            pending = pending.slice(length)
        }
    }
    const drain = (final: boolean) => {
        const output: string[] = []
        // Latin punctuation needs following whitespace, so a split decimal/abbreviation is not
        // committed solely because a stream chunk ends with a period. CJK punctuation is a boundary.
        const boundary = /[。！？]+["'”’)]*|[.!?]+["'”’)]*\s+|\n+/g
        let match: RegExpExecArray | null
        let consumed = 0
        while ((match = boundary.exec(visible))) {
            const end = match.index + match[0].length
            const candidate = visible.slice(consumed, end)
            output.push(...chunks(candidate))
            consumed = end
        }
        visible = visible.slice(consumed)
        while (!final && visible.length >= maxChunkLength) {
            let end = visible.lastIndexOf(' ', maxChunkLength)
            if (end < maxChunkLength / 2) end = maxChunkLength
            if (/[\uD800-\uDBFF]/.test(visible[end - 1])) end--
            const part = visible.slice(0, end)
            const splitUrl = /https?:\/\/\S*$/.test(part) && !/\s/.test(visible[end] ?? '')
            output.push(...chunks(part))
            visible = visible.slice(end)
            if (splitUrl) {
                const space = visible.search(/\s/)
                skippingUrlTail = space === -1
                visible = space === -1 ? '' : visible.slice(space)
            }
        }
        if (final) {
            output.push(...chunks(visible))
            visible = ''
        }
        return output
    }
    return {
        prime: (text: string) => {
            pending += text
            filter(false)
            visible = ''
        },
        push: (text: string) => {
            if (skippingUrlTail) {
                const space = text.search(/\s/)
                if (space === -1) return []
                text = text.slice(space)
                skippingUrlTail = false
            }
            pending += text
            filter(false)
            return drain(false)
        },
        finish: () => {
            filter(true)
            return drain(true)
        },
    }
}
