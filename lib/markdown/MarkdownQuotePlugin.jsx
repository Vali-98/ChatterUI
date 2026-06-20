const OPEN_QUOTES = {
    '“': 'english',
    '„': 'low9',
    '‟': 'reversed9',
}

const CLOSE_QUOTES = new Set(['”'])

const GUILLEMETS = new Set(['«', '»'])

module.exports = function doubleQuotePlugin(md) {
    md.core.ruler.after('inline', 'double_quote', function (state) {
        for (const blockToken of state.tokens) {
            if (blockToken.type !== 'inline' || !blockToken.children) {
                continue
            }

            const newChildren = []

            let quoteOpen = false

            const emitText = (content) => {
                const token = new state.Token('text', '', 0)
                token.content = content
                newChildren.push(token)
            }

            const emitOpen = (quoteType, quoteChar) => {
                const token = new state.Token('double_quote_open', 'span', 1)

                token.meta = {
                    quoteType,
                }

                newChildren.push(token)

                quoteOpen = true
                return token
            }

            const emitClose = () => {
                const token = new state.Token('double_quote_close', 'span', -1)

                newChildren.push(token)

                quoteOpen = false
            }
            let openToken = null

            for (const token of blockToken.children) {
                if (token.type !== 'text') {
                    newChildren.push(token)
                    continue
                }

                const content = token.content
                let lastPos = 0

                for (let i = 0; i < content.length; i++) {
                    const ch = content[i]

                    let type = null
                    let quoteType = null

                    if (OPEN_QUOTES[ch]) {
                        type = 'open'
                        quoteType = OPEN_QUOTES[ch]
                    } else if (CLOSE_QUOTES.has(ch)) {
                        type = 'close'
                    } else if (ch === '"') {
                        type = 'ascii'
                        quoteType = 'ascii'
                    } else if (GUILLEMETS.has(ch)) {
                        type = 'guillemet'
                        quoteType = 'guillemet'
                    }

                    if (!type) continue

                    if (i > lastPos) {
                        emitText(content.slice(lastPos, i))
                    }

                    switch (type) {
                        case 'open':
                            if (!quoteOpen) {
                                openToken = emitOpen(quoteType, ch)
                            } else {
                                emitText(ch)
                            }
                            break

                        case 'close':
                            if (quoteOpen) {
                                emitClose()
                            } else {
                                emitText(ch)
                            }
                            break

                        case 'ascii':
                            if (quoteOpen) {
                                emitClose()
                            } else {
                                openToken = emitOpen('ascii', ch)
                            }
                            break

                        case 'guillemet':
                            if (quoteOpen) {
                                emitClose()
                            } else {
                                openToken = emitOpen('guillemet', ch)
                            }
                            break
                    }

                    lastPos = i + 1
                }

                if (lastPos < content.length) {
                    emitText(content.slice(lastPos))
                }
            }

            if (quoteOpen) {
                const close = new state.Token('double_quote_close', 'span', -1)

                close.meta = {
                    synthetic: true,
                }
                if (openToken?.meta) openToken.meta.dangling = true

                newChildren.push(close)
            }

            blockToken.children = newChildren
        }
    })
}
