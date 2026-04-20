module.exports = function doubleQuotePlugin(md) {
    md.core.ruler.after('inline', 'double_quote', function (state) {
        for (const blockToken of state.tokens) {
            if (blockToken.type !== 'inline' || !blockToken.children) continue

            const children = blockToken.children
            const newChildren = []
            let insideQuote = false
            let lastOpenIdx = -1

            for (let i = 0; i < children.length; i++) {
                const token = children[i]

                if (token.type === 'text') {
                    const content = token.content
                    let lastPos = 0

                    for (let j = 0; j < content.length; j++) {
                        if (content[j] === '"') {
                            if (j > lastPos) {
                                const t = new state.Token('text', '', 0)
                                t.content = content.slice(lastPos, j)
                                newChildren.push(t)
                            }

                            if (!insideQuote) {
                                const open = new state.Token('double_quote_open', 'span', 1)
                                newChildren.push(open)
                                lastOpenIdx = newChildren.length - 1
                                insideQuote = true
                            } else {
                                const close = new state.Token('double_quote_close', 'span', -1)
                                newChildren.push(close)
                                insideQuote = false
                                lastOpenIdx = -1
                            }
                            lastPos = j + 1
                        }
                    }
                    if (lastPos < content.length) {
                        const t = new state.Token('text', '', 0)
                        t.content = content.slice(lastPos)
                        newChildren.push(t)
                    }
                } else {
                    newChildren.push(token)
                }
            }

            // Safety: revert unclosed quotes to plain text
            if (insideQuote && lastOpenIdx !== -1) {
                newChildren[lastOpenIdx] = Object.assign(new state.Token('text', '', 0), {
                    content: '"',
                })
            }
            blockToken.children = newChildren
        }
    })
}
