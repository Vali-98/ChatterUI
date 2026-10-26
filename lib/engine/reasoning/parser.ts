import { thinkTags } from '@lib/markdown/ThinkTags'

const tags = thinkTags.map((tag) => ({ ...tag, open: new RegExp(tag.open.source, 'i') }))
const controls = /[<`~\n]/

// Incremental delimiter state only: no Markdown AST and no rescanning the accumulated answer.
export const createReasoningParser = () => {
    let pending = ''
    let close: string | undefined
    let hasReasoning = false
    let code: { marker: string; length: number; fenced: boolean } | undefined
    let indent = 0
    let indentedLine = false
    const drain = (final: boolean) => {
        let text = ''
        let reasoning = ''
        const emit = (value: string) => {
            text += value
            if (value === '\n') {
                indent = 0
                indentedLine = false
            } else if (indent >= 0) {
                let spaces = 0
                while (value[spaces] === ' ') spaces++
                if (indent + spaces >= 4) indentedLine = true
                indent = spaces === value.length ? indent + spaces : -1
            }
        }
        while (pending) {
            if (close) {
                const end = pending.toLowerCase().indexOf(close.toLowerCase())
                if (end >= 0) {
                    reasoning += pending.slice(0, end)
                    pending = pending.slice(end + close.length)
                    close = undefined
                    continue
                }
                const count = final
                    ? pending.length
                    : Math.max(0, pending.length - close.length + 1)
                reasoning += pending.slice(0, count)
                pending = pending.slice(count)
                break
            }
            const start = pending.search(controls)
            if (start === -1) {
                emit(pending)
                pending = ''
                break
            }
            if (start > 0) {
                emit(pending.slice(0, start))
                pending = pending.slice(start)
            }
            const marker = pending[0]
            if ((marker === '`' || marker === '~') && (code || !indentedLine)) {
                let length = 1
                while (pending[length] === marker) length++
                if (!final && length === pending.length) break
                const fenced = indent >= 0 && indent <= 3 && length >= 3
                if (!code && (marker === '`' || fenced)) code = { marker, length, fenced }
                else if (
                    code?.marker === marker &&
                    (code.fenced
                        ? indent >= 0 && indent <= 3 && length >= code.length
                        : length === code.length)
                ) {
                    if (code.fenced) {
                        const rest = pending.slice(length)
                        const newline = rest.indexOf('\n')
                        const tail = newline < 0 ? rest : rest.slice(0, newline)
                        if (/^[ \t\r]*$/.test(tail)) {
                            if (!final && newline < 0) break
                            code = undefined
                        }
                    } else code = undefined
                }
                emit(pending.slice(0, length))
                pending = pending.slice(length)
                continue
            }
            if (marker === '<' && !code && !indentedLine) {
                const tag = tags.find((tag) => tag.open.test(pending))
                if (tag) {
                    const match = pending.match(tag.open)!
                    close = tag.close
                    pending = pending.slice(match[0].length)
                    if (hasReasoning) reasoning += '\n\n'
                    hasReasoning = true
                    continue
                }
                const lower = pending.toLowerCase()
                if (
                    !final &&
                    pending.length < 256 &&
                    tags.some(
                        ({ prefix }) =>
                            prefix.startsWith(lower) ||
                            (lower.startsWith(prefix) && !pending.includes('>'))
                    )
                )
                    break
            }
            emit(marker)
            pending = pending.slice(1)
        }
        return { text, reasoning }
    }
    return {
        startReasoning: (endTag: string) => {
            close = endTag
        },
        push: (text: string) => {
            pending += text
            return drain(false)
        },
        finish: () => drain(true),
    }
}

export const splitReasoning = (text: string) => {
    const parser = createReasoningParser()
    const first = parser.push(text)
    const last = parser.finish()
    return { text: first.text + last.text, reasoning: first.reasoning + last.reasoning }
}
