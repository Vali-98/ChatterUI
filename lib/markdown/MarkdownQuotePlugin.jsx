module.exports = function doubleQuotePlugin(md) {
    // Define a new rule to inline various double-quote types
    md.core.ruler.push('double_quote', function (state) {
        if (state.env.inDoubleQuote) return
        // Define a regex to match double quotes, including curly ones
        const doubleQuoteRegex = /([“”"])(.*?)([“”"])/g

        // Loop through all tokens
        for (let i = 0; i < state.tokens.length; i++) {
            const token = state.tokens[i]

            if (token.type === 'inline' && doubleQuoteRegex.test(token.content)) {
                const parts = []
                let lastIndex = 0
                // Use the regex to find double-quoted segments
                token.content.replace(
                    doubleQuoteRegex,
                    (match, openQuote, text, closeQuote, offset) => {
                        // Push the text before the match as a plain text token
                        if (offset > lastIndex) {
                            parts.push(
                                ...md.parseInline(token.content.slice(lastIndex, offset), state.env)
                            )
                        }

                        // Push a double-quote token for the matched quote and its content

                        parts.push({
                            type: 'double_quote',
                            children: [
                                { type: 'text', content: `${openQuote}` },
                                ...md.parseInline(text, state.env),
                                { type: 'text', content: `${closeQuote}` },
                            ],
                        })

                        lastIndex = offset + match.length
                    }
                )

                // Add any remaining text after the last match
                if (lastIndex < token.content.length) {
                    parts.push(...md.parseInline(token.content.slice(lastIndex), state.env))
                }
                // Convert parts into tokens and replace the child tokens
                state.tokens.splice(
                    i,
                    1,
                    ...parts.map((part) => {
                        const newToken = new state.Token(part.type, '', 0)
                        newToken.content = part.content
                        newToken.children = part.children
                        return newToken
                    })
                )
            }
        }
    })
}
