module.exports = function thinkPlugin(md) {
    md.block.ruler.before('paragraph', 'think', function (state, startLine, endLine, silent) {
        let thinkLine = -1
        // Scan lines for '<think'
        for (let i = startLine; i < endLine; i++) {
            const pos = state.bMarks[i] + state.tShift[i]
            const max = state.eMarks[i]
            const line = state.src.slice(pos, max)
            if (line.indexOf('<think') !== -1) {
                thinkLine = i
                break
            }
        }
        if (thinkLine === -1) return false

        if (thinkLine > startLine) {
            // If line isn't first, we process previous lines first
            state.lineMax = startLine
            return false
        }
        // Begin accumulating <think lines
        let pos = state.bMarks[thinkLine] + state.tShift[thinkLine]
        let max = state.eMarks[thinkLine]
        let line = state.src.slice(pos, max).trim()
        const lineIndex = line.indexOf('<think')

        // Early exit in case something went terribly wrong
        if (lineIndex === -1) return false

        // silent mode debug
        if (silent) return true

        // in cases where we have inline text before the tag, render it
        if (lineIndex > 0) {
            const textToken = state.push('paragraph', '', 0)
            textToken.children = md.parse(line.slice(0, lineIndex), state.env)
            line = line.slice(lineIndex)
        }
        let trailing = undefined
        let hasCloseTag = false
        let nextLine = thinkLine + 1
        const contentLines = []

        // Ignore space between tag open and close
        const openTagStart = line.indexOf('<think')
        const openTagEnd = line.indexOf('>', openTagStart)
        if (openTagStart !== -1 && openTagEnd !== -1) {
            let inlineContent = line.slice(openTagEnd + 1)
            if (inlineContent.trim().length) {
                const endThinkIndex = line.indexOf('</think>')
                if (endThinkIndex > 0) {
                    // if there is a trailing string, set to be rendered later
                    if (endThinkIndex + 8 < line.length) {
                        trailing = line.slice(endThinkIndex + 8)
                    }
                    inlineContent = inlineContent.slice(0, endThinkIndex - 7)
                    hasCloseTag = true
                    //we never push past the first line, so back to here
                    nextLine--
                }
                contentLines.push(inlineContent)
            }
        }

        // Accumulate until </think> is reached
        while (!hasCloseTag && nextLine < endLine) {
            pos = state.bMarks[nextLine] + state.tShift[nextLine]
            max = state.eMarks[nextLine]
            line = state.src.slice(pos, max).trim()
            if (line.includes('</think>')) {
                const endThinkIndex = line.indexOf('</think>')
                // if there is a leading string, push to content
                if (endThinkIndex > 0) {
                    contentLines.push(line.slice(0, endThinkIndex))
                }
                // if there is a trailing string, set to be rendered later
                if (endThinkIndex + 8 < line.length) {
                    trailing = line.slice(endThinkIndex + 8)
                }
                hasCloseTag = true
                break
            }
            contentLines.push(line)
            nextLine++
        }

        // Update line
        state.line = hasCloseTag ? nextLine + 1 : endLine

        // Create token
        const token = state.push('think', '', 0)
        token.hidden = true
        token.map = [thinkLine, state.line]
        token.info = hasCloseTag

        // Parse all nodes within the block as children
        token.children = md.parse(contentLines.join('\n').trim(), state.env)

        // Parse any trailing text
        if (trailing) {
            const textToken = state.push('paragraph', '', 0)
            textToken.children = md.parse(trailing, state.env)
        }

        return true
    })
}
