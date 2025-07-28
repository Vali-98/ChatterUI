module.exports = function latexDetectorPlugin(md) {
    // Block math: \[...\] and $$...$$
    md.block.ruler.before(
        'fence',
        'latex_block_math',
        function (state, startLine, endLine, silent) {
            const start = state.bMarks[startLine] + state.tShift[startLine]
            const max = state.eMarks[startLine]
            const line = state.src.slice(start, max).trim()

            let isBracket = line.startsWith('\\[')
            let isDollar = line.startsWith('$$')

            if (!isBracket && !isDollar) return false

            let nextLine = startLine
            let content = ''
            let found = false

            if (isBracket && line.endsWith('\\]')) {
                content = line.slice(2, -2).trim()
                found = true
                nextLine++
            } else if (isDollar && line.endsWith('$$') && line.length > 4) {
                content = line.slice(2, -2).trim()
                found = true
                nextLine++
            } else {
                content = line.slice(2) + '\n'
                nextLine++
                while (nextLine < endLine) {
                    const nextStart = state.bMarks[nextLine] + state.tShift[nextLine]
                    const nextMax = state.eMarks[nextLine]
                    const nextLineText = state.src.slice(nextStart, nextMax).trim()

                    if (
                        (isBracket && nextLineText.endsWith('\\]')) ||
                        (isDollar && nextLineText === '$$')
                    ) {
                        content += isBracket ? nextLineText.slice(0, -2) : ''
                        found = true
                        nextLine++
                        break
                    }

                    content += nextLineText + '\n'
                    nextLine++
                }
            }

            if (!found) return false
            if (silent) return true

            const token = state.push('latex_block', 'math', 0)
            token.block = true
            token.content = content.trim()
            token.map = [startLine, nextLine]
            state.line = nextLine
            return true
        }
    )

    md.inline.ruler.before('escape', 'latex_inline', function (state, silent) {
        const start = state.pos
        const max = state.posMax
        const src = state.src

        if (start >= max) return false

        // --- Match $$...$$ inline ---
        if (src[start] === '$' && src[start + 1] === '$') {
            let end = start + 2
            while (end < max) {
                if (src[end] === '$' && src[end + 1] === '$') {
                    if (silent) return true
                    const token = state.push('latex_inline', 'math', 0)
                    token.content = src.slice(start + 2, end)
                    state.pos = end + 2
                    return true
                }
                end++
            }
        }

        // --- Match \[...\] inline ---
        if (src.startsWith('\\[', start)) {
            const end = src.indexOf('\\]', start + 2)
            if (end !== -1 && end < max) {
                if (silent) return true
                const token = state.push('latex_inline', 'math', 0)
                token.content = src.slice(start + 2, end)
                state.pos = end + 2
                return true
            }
        }

        // --- Match \( ... \) inline ---
        if (src.startsWith('\\(', start)) {
            const end = src.indexOf('\\)', start + 2)
            if (end !== -1 && end < max) {
                if (silent) return true
                const token = state.push('latex_inline', 'math', 0)
                token.content = src.slice(start + 2, end)
                state.pos = end + 2
                return true
            }
        }

        // --- Match $...$ (not $$...$$) ---
        if (
            src[start] === '$' &&
            src[start + 1] !== '$' &&
            (start === 0 || src[start - 1] !== '$')
        ) {
            let end = start + 1
            while (end < max) {
                if (src[end] === '$') {
                    // Ensure not escaped
                    let backslashes = 0
                    let k = end - 1
                    while (k >= 0 && src[k] === '\\') {
                        backslashes++
                        k--
                    }
                    if (backslashes % 2 === 0) break
                }
                end++
            }

            if (end < max && src[end] === '$') {
                if (silent) return true
                const token = state.push('latex_inline', 'math', 0)
                token.content = src.slice(start + 1, end)
                state.pos = end + 1
                return true
            }
        }

        return false
    })

    /*md.core.ruler.after('inline', 'latex_in_code_blocks', function (state) {
        for (const token of state.tokens) {
            if (token.type !== 'inline' || !token.children) continue

            const children = token.children
            const newChildren = []

            for (const child of children) {
                if (child.type === 'code_inline' || child.type === 'fence') {
                    const content = child.content
                    if (looksLikeLaTeX(content)) {
                        const mathToken = new state.Token('latex_inline', 'math', 0)
                        mathToken.content = content
                        newChildren.push(mathToken)
                    } else {
                        newChildren.push(child)
                    }
                } else {
                    newChildren.push(child)
                }
            }

            token.children = newChildren
        }

        return true
    })*/
}

function looksLikeLaTeX(content) {
    const latexPattern =
        /\\(frac|vec|Delta|alpha|beta|gamma|theta|mu|cdot|ldots|int|sum|sqrt)\b|[_^]\w+|[_^]{\w+}|[=+\-*/^]/
    const codeLikePattern = /(function|var|let|const|if\s*\(|=>|import|return|class|\{\}|\(\))/

    return latexPattern.test(content) && !codeLikePattern.test(content)
}
