const thinkTags = [
    {
        open: /^<think\b[^>]*>/,
        close: '</think>',
    },
    {
        open: /^<\|channel>thought/,
        close: '<channel|>',
    },
    {
        open: /^<seed:think>/,
        close: '</seed:think>',
    },
]

module.exports = function thinkPlugin(md) {
    md.block.ruler.before('paragraph', 'think', function (state, startLine, endLine, silent) {
        let tagLine = -1
        let activeTag = null

        // 🔍 Find first matching tag
        for (let i = startLine; i < endLine; i++) {
            const pos = state.bMarks[i] + state.tShift[i]
            const max = state.eMarks[i]
            const line = state.src.slice(pos, max)

            for (const tag of thinkTags) {
                const match = line.slice(line.search(/\S|$/)).match(tag.open)
                if (match) {
                    tagLine = i
                    activeTag = tag
                    break
                }
            }

            if (tagLine !== -1) break
        }

        if (tagLine === -1 || !activeTag) return false

        if (tagLine > startLine) {
            state.lineMax = startLine
            return false
        }

        let pos = state.bMarks[tagLine] + state.tShift[tagLine]
        let max = state.eMarks[tagLine]
        let line = state.src.slice(pos, max)

        // Trim left only for matching, preserve original for slicing
        const trimmed = line.trimStart()
        const openIndex = line.indexOf(trimmed)

        const match = trimmed.match(activeTag.open)
        if (!match) return false

        const matchIndex = openIndex + match.index
        const openLength = match[0].length

        if (silent) return true

        // 📝 Text before tag
        if (matchIndex > 0) {
            const textToken = state.push('paragraph', '', 0)
            textToken.children = md.parse(line.slice(0, matchIndex), state.env)
        }

        let trailing
        let hasCloseTag = false
        let nextLine = tagLine + 1
        const contentLines = []

        // 📦 Inline content after opening tag
        let inlineContent = line.slice(matchIndex + openLength)

        if (inlineContent.trim().length) {
            const closeIndex = inlineContent.indexOf(activeTag.close)

            if (closeIndex !== -1) {
                contentLines.push(inlineContent.slice(0, closeIndex))

                if (closeIndex + activeTag.close.length < inlineContent.length) {
                    trailing = inlineContent.slice(closeIndex + activeTag.close.length)
                }

                hasCloseTag = true
                nextLine--
            } else {
                contentLines.push(inlineContent)
            }
        }

        // 🔄 Accumulate until closing tag
        while (!hasCloseTag && nextLine < endLine) {
            pos = state.bMarks[nextLine] + state.tShift[nextLine]
            max = state.eMarks[nextLine]
            line = state.src.slice(pos, max)

            const closeIndex = line.indexOf(activeTag.close)

            if (closeIndex !== -1) {
                if (closeIndex > 0) {
                    contentLines.push(line.slice(0, closeIndex))
                }

                if (closeIndex + activeTag.close.length < line.length) {
                    trailing = line.slice(closeIndex + activeTag.close.length)
                }

                hasCloseTag = true
                break
            }

            contentLines.push(line.trim())
            nextLine++
        }

        state.line = hasCloseTag ? nextLine + 1 : endLine

        // 🧱 Create token
        const token = state.push('think', '', 0)
        token.hidden = true
        token.map = [tagLine, state.line]
        token.info = hasCloseTag

        token.children = md.parse(contentLines.join('\n').trim(), state.env)

        // 🧾 Trailing content
        if (trailing) {
            const textToken = state.push('paragraph', '', 0)
            textToken.children = md.parse(trailing, state.env)
        }

        return true
    })
}
