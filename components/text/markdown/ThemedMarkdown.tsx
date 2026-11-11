import { useMemo, type PropsWithChildren } from 'react'
import Markdown, { type MarkdownProps } from 'react-native-markdown-display'

import { markdownParser } from '@lib/markdown/parser'

import { markdownRules } from './renderRules'
import { useMarkdownStyles } from './styles'

export type ThemedMarkdownProps = PropsWithChildren<
    Omit<MarkdownProps, 'renderer' | 'markdownit' | 'rules'>
>

const ThemedMarkdown = ({ children, style, mergeStyle = false, ...props }: ThemedMarkdownProps) => {
    const themeStyles = useMarkdownStyles()
    const styles = useMemo(
        () => (style ? { ...themeStyles, ...style } : themeStyles),
        [themeStyles, style]
    )
    return (
        <Markdown
            {...props}
            mergeStyle={mergeStyle}
            markdownit={markdownParser}
            rules={markdownRules}
            style={styles}>
            {children}
        </Markdown>
    )
}

export default ThemedMarkdown
