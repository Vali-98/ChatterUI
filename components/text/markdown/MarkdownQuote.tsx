import type { ReactNode } from 'react'
import { Text, type StyleProp, type TextStyle } from 'react-native'
import type { ASTNode } from 'react-native-markdown-display'

const MarkdownQuote = ({
    node,
    children,
    style,
}: {
    node: ASTNode & {
        sourceMeta?: { quoteType?: string; dangling?: boolean }
        meta?: { quoteType?: string }
    }
    children: ReactNode
    style: StyleProp<TextStyle>
}) => {
    const quotes = {
        english: ['“', '”'],
        low9: ['„', '”'],
        reversed9: ['‟', '”'],
        ascii: ['"', '"'],
        guillemet: ['«', '»'],
    }

    const quoteType = (node.sourceMeta?.quoteType ??
        node.meta?.quoteType ??
        'english') as keyof typeof quotes
    let [open, close] = quotes[quoteType] || quotes.english
    if (node.sourceMeta?.dangling) close = ''
    return (
        <Text key={node.key} style={style}>
            {open}
            {children}
            {close}
        </Text>
    )
}

export default MarkdownQuote
