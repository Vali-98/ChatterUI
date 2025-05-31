module.exports = function doubleQuotePlugin(md) {
    md.core.ruler.after('inline', 'double_quote', function (state) {
        for (const blockToken of state.tokens) {
            if (blockToken.type !== 'inline' || !blockToken.children) continue

            const children = blockToken.children
            const newChildren = []

            for (let i = 0; i < children.length; i++) {
                const token = children[i]

                if (token.type === 'text') {
                    const regex = /([“”"])([^“”"]+?)\1/g
                    let remaining = token.content
                    let lastIndex = 0
                    let match

                    while ((match = regex.exec(token.content))) {
                        const [fullMatch, quoteChar, innerText] = match
                        const matchStart = match.index

                        // Add text before the quote
                        if (matchStart > lastIndex) {
                            const before = new state.Token('text', '', 0)
                            before.content = token.content.slice(lastIndex, matchStart)
                            newChildren.push(before)
                        }

                        // Tokenize the inside of the quote
                        const innerState = new md.inline.State(innerText, md, state.env, [])
                        md.inline.tokenize(innerState)

                        // Wrap in a double_quote token
                        const dqToken = new state.Token('double_quote', '', 0)
                        dqToken.children = [
                            Object.assign(new state.Token('text', '', 0), { content: quoteChar }),
                            ...innerState.tokens,
                            Object.assign(new state.Token('text', '', 0), { content: quoteChar }),
                        ]
                        newChildren.push(dqToken)

                        lastIndex = match.index + fullMatch.length
                    }

                    // Remaining text
                    if (lastIndex < token.content.length) {
                        const tail = new state.Token('text', '', 0)
                        tail.content = token.content.slice(lastIndex)
                        newChildren.push(tail)
                    }
                } else {
                    newChildren.push(token)
                }
            }

            blockToken.children = newChildren
        }

        return true
    })
}
