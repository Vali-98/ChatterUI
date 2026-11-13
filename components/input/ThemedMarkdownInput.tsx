import {
    MarkdownInput,
    type MarkdownInputProps,
    type MarkdownInputRef,
} from '@vali98/react-native-markdown-display'
import { forwardRef } from 'react'
import { StyleSheet } from 'react-native'

import { markdownRules } from '@components/text/markdown/renderRules'
import { useMarkdownStyles } from '@components/text/markdown/styles'
import { Theme } from '@lib/theme/ThemeManager'

export type { MarkdownInputRef }
export type ThemedMarkdownInputProps = Omit<MarkdownInputProps, 'markdownStyle' | 'renderRules'>

const ThemedMarkdownInput = forwardRef<MarkdownInputRef, ThemedMarkdownInputProps>(
    function ThemedMarkdownInput({ typographer = true, ...props }, ref) {
        const { color } = Theme.useTheme()
        const styles = useMarkdownStyles()
        const sourceStyle = StyleSheet.flatten([props.style, props.textStyle])
        return (
            <MarkdownInput
                delimiterColor={color.text._400}
                placeholderTextColor={color.text._500}
                selectionColor={color.primary._400}
                textColor={sourceStyle?.color ?? color.text._100}
                fontSize={sourceStyle?.fontSize ?? styles.paragraph.fontSize}
                {...props}
                ref={ref}
                typographer={typographer}
                markdownStyle={styles}
                renderRules={markdownRules}
            />
        )
    }
)

export default ThemedMarkdownInput
