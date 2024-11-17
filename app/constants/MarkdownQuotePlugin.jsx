module.exports = function doubleQuotePlugin(md) {
    // Define a new rule to handle various double-quote types
    md.core.ruler.push('double_quote', function (state) {
        // Define a regex to match double quotes, including curly ones
        const doubleQuoteRegex = /([“”"])(.*?)([“”"])/g

        // Loop through all tokens
        for (let i = 0; i < state.tokens.length; i++) {
            const token = state.tokens[i]

            // Check if the token is of type 'inline' which contains text
            if (token.type === 'inline') {
                for (let j = 0; j < token.children.length; j++) {
                    const child = token.children[j]

                    // Check if the child token is a text node
                    if (child.type === 'text' && doubleQuoteRegex.test(child.content)) {
                        const parts = []
                        let lastIndex = 0

                        // Use the regex to find double-quoted segments
                        child.content.replace(
                            doubleQuoteRegex,
                            (match, openQuote, text, closeQuote, offset) => {
                                // Push the text before the match as a plain text token
                                if (offset > lastIndex) {
                                    parts.push({
                                        type: 'text',
                                        content: child.content.slice(lastIndex, offset),
                                    })
                                }

                                // Push a double-quote token for the matched quote and its content
                                parts.push({
                                    type: 'double_quote',
                                    content: `${openQuote}${text}${closeQuote}`,
                                })

                                lastIndex = offset + match.length
                            }
                        )

                        // Add any remaining text after the last match
                        if (lastIndex < child.content.length) {
                            parts.push({
                                type: 'text',
                                content: child.content.slice(lastIndex),
                            })
                        }
                        // Convert parts into tokens and replace the child tokens
                        token.children.splice(
                            j,
                            1,
                            ...parts.map((part) => {
                                const newToken = new state.Token(part.type, '', 0)
                                newToken.content = part.content
                                return newToken
                            })
                        )
                    }
                }
            }
        }
    })
}
