module.exports = function doubleQuotePlugin(md) {
    const getQuoteType = (ch) => {
        if (ch === '“') return 'open'
        if (ch === '”') return 'close'
        if (ch === '"') return 'ascii'
        return null
    }

    md.core.ruler.after('inline', 'double_quote', function (state) {
        for (const blockToken of state.tokens) {
            if (blockToken.type !== 'inline' || !blockToken.children) continue

            const children = blockToken.children
            const newChildren = []

            let asciiOpen = false
            let lastOpenIdx = -1

            for (let i = 0; i < children.length; i++) {
                const token = children[i]

                if (token.type !== 'text') {
                    newChildren.push(token)
                    continue
                }

                const content = token.content
                let lastPos = 0

                for (let j = 0; j < content.length; j++) {
                    const type = getQuoteType(content[j])
                    if (!type) continue

                    // flush text
                    if (j > lastPos) {
                        const t = new state.Token('text', '', 0)
                        t.content = content.slice(lastPos, j)
                        newChildren.push(t)
                    }

                    // Open only curly or ascii when closed
                    if (type === 'open' || (type === 'ascii' && !asciiOpen)) {
                        const open = new state.Token('double_quote_open', 'span', 1)
                        newChildren.push(open)
                        lastOpenIdx = newChildren.length - 1

                        if (type === 'ascii') asciiOpen = true
                    }

                    // Close only curly or ascii when open
                    else if (type === 'close' || (type === 'ascii' && asciiOpen)) {
                        const close = new state.Token('double_quote_close', 'span', -1)
                        newChildren.push(close)
                        lastOpenIdx = -1

                        if (type === 'ascii') asciiOpen = false
                    }

                    lastPos = j + 1
                }

                if (lastPos < content.length) {
                    const t = new state.Token('text', '', 0)
                    t.content = content.slice(lastPos)
                    newChildren.push(t)
                }
            }

            // safety: revert if last quote never closed
            if (lastOpenIdx !== -1) {
                newChildren[lastOpenIdx] = Object.assign(new state.Token('text', '', 0), {
                    content: '"',
                })
            }

            blockToken.children = newChildren
        }
    })
}
