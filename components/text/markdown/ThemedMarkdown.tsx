import Markdown, { type MarkdownProps } from '@vali98/react-native-markdown-display'
import { useMemo } from 'react'

import { markdownRules } from './renderRules'
import { useMarkdownStyles } from './styles'

export type ThemedMarkdownProps = Omit<
    MarkdownProps,
    'source' | 'children' | 'styles' | 'rules' | 'renderRules'
> & { children: string }

const ThemedMarkdown = ({ children, style, typographer = true, ...props }: ThemedMarkdownProps) => {
    const themeStyles = useMarkdownStyles()
    const styles = useMemo(
        () => (style ? { ...themeStyles, ...style } : themeStyles),
        [themeStyles, style]
    )
    return (
        <Markdown {...props} typographer={typographer} renderRules={markdownRules} style={styles}>
            {children}
        </Markdown>
    )
}

export default ThemedMarkdown
