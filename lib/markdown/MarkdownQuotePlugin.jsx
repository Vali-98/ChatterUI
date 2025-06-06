module.exports = function doubleQuotePlugin(md) {
    md.core.ruler.after('inline', 'double_quote', function (state) {
        for (const blockToken of state.tokens) {
            if (blockToken.type !== 'inline' || !blockToken.children) continue
            const children = blockToken.children
            const newChildren = []
            let buffer = []
            let insideQuote = false
            for (let i = 0; i < children.length; i++) {
                const token = children[i]
                if (token.type === 'text') {
                    const content = token.content
                    let start = 0
                    for (let j = 0; j < content.length; j++) {
                        if (content[j] === '"') {
                            // Add text before quote
                            if (j > start) {
                                const before = new state.Token('text', '', 0)
                                before.content = content.slice(start, j)
                                if (insideQuote) {
                                    buffer.push(before)
                                } else {
                                    newChildren.push(before)
                                }
                            }
                            // Toggle quote state
                            if (!insideQuote) {
                                // Start quote
                                buffer = []
                                buffer.push(
                                    Object.assign(new state.Token('text', '', 0), { content: '"' })
                                )
                                insideQuote = true
                            } else {
                                // End quote
                                buffer.push(
                                    Object.assign(new state.Token('text', '', 0), { content: '"' })
                                )
                                const dqToken = new state.Token('double_quote', '', 0)
                                dqToken.children = buffer
                                newChildren.push(dqToken)
                                buffer = []
                                insideQuote = false
                            }
                            start = j + 1
                        }
                    }
                    // Remaining text after last quote
                    if (start < content.length) {
                        const remainder = new state.Token('text', '', 0)
                        remainder.content = content.slice(start)
                        if (insideQuote) {
                            buffer.push(remainder)
                        } else {
                            newChildren.push(remainder)
                        }
                    }
                } else {
                    if (insideQuote) {
                        buffer.push(token)
                    } else {
                        newChildren.push(token)
                    }
                }
            }
            // If unclosed quote, dump buffer as-is
            if (insideQuote) {
                newChildren.push(...buffer)
            }
            blockToken.children = newChildren
        }
        return true
    })
}
