module.exports = function thinkPlugin(md) {
    md.core.ruler.push('think', function (state) {
        state.tokens.forEach((token, idx) => {
            if (token.type !== 'inline' || !token.content.includes('<think>')) return

            const content = token.content
            const newTokens = []
            const regex = new RegExp('<think>(.*?)(?:</think>|$)', 'gs')
            let match
            let lastIndex = 0

            while ((match = regex.exec(content)) !== null) {
                if (match.index > lastIndex) {
                    const textToken = new state.Token('text', '', 0)
                    textToken.content = content.slice(lastIndex, match.index)
                    newTokens.push(textToken)
                }

                const thinkToken = new state.Token('think', '', 0)
                thinkToken.hidden = true
                thinkToken.children = md.parseInline(match[1], state.env)
                newTokens.push(thinkToken)

                lastIndex = regex.lastIndex
            }

            if (lastIndex < content.length) {
                const textToken = new state.Token('text', '', 0)
                textToken.content = content.slice(lastIndex)
                newTokens.push(textToken)
            }
            state.tokens[idx].content = ''
            state.tokens[idx].children = newTokens
        })
    })
}
