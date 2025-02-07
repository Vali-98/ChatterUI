import Accordion from '@components/views/Accordion'
import { Theme } from '@lib/theme/ThemeManager'
import { Platform, StyleSheet, Text } from 'react-native'
import { MarkdownIt } from 'react-native-markdown-display'

import doubleQuotePlugin from './MarkdownQuotePlugin'
import thinkPlugin from './MarkdownThinkPlugin'

export namespace MarkdownStyle {
    export const Rules = MarkdownIt({ typographer: true }).use(thinkPlugin).use(doubleQuotePlugin)

    export const RenderRules = {
        double_quote: (node: any, children: any, parent: any, styles: any) => {
            return (
                <Text key={node.key} style={styles.double_quote}>
                    "{children}"
                </Text>
            )
        },
        think: (node: any, children: any, parent: any, styles: any) => {
            return (
                <Accordion
                    key={node.key}
                    label={node.sourceInfo ? 'Thought Process' : 'Thinking...'}
                    style={{
                        flex: 1,
                        marginBottom: 8,
                        elevation: 8,
                    }}>
                    {children}
                </Accordion>
            )
        },
    }

    export const useMarkdownStyle = () => {
        const { color, spacing, borderRadius } = Theme.useTheme()

        return StyleSheet.create({
            double_quote: { color: color.quote },
            // The main container
            body: {},

            // Headings
            heading1: {
                flexDirection: 'row',
                fontSize: 32,
                color: color.text._100,
                fontWeight: '500',
            },
            heading2: {
                flexDirection: 'row',
                fontSize: 24,
                color: color.text._100,
                fontWeight: '500',
            },
            heading3: {
                flexDirection: 'row',
                fontSize: 18,
                color: color.text._100,
                fontWeight: '500',
            },
            heading4: {
                flexDirection: 'row',
                fontSize: 16,
                color: color.text._100,
                fontWeight: '500',
            },
            heading5: {
                flexDirection: 'row',
                fontSize: 13,
                color: color.text._100,
                fontWeight: '500',
            },
            heading6: {
                flexDirection: 'row',
                fontSize: 11,
                color: color.text._100,
                fontWeight: '500',
            },

            // Horizontal Rule
            hr: {
                backgroundColor: color.primary._500,
                height: 1,
                marginTop: spacing.m,
            },

            // Emphasis
            strong: {
                fontWeight: 'bold',
                color: color.text._100,
            },
            em: {
                fontStyle: 'italic',
                color: color.text._400,
            },
            s: {
                textDecorationLine: 'line-through',
                color: color.text._400,
            },

            // Blockquotes
            blockquote: {
                backgroundColor: color.neutral._200,
                borderColor: color.primary._500,
                borderLeftWidth: 4,
                marginLeft: spacing.sm,
                paddingHorizontal: spacing.sm,
                color: color.text._400,
            },

            // Lists
            bullet_list: {
                marginVertical: spacing.sm,
            },
            ordered_list: {
                marginVertical: spacing.sm,
            },
            list_item: {
                flexDirection: 'row',
                justifyContent: 'flex-start',
                color: color.text._100,
            },
            // @pseudo class, does not have a unique render rule
            bullet_list_icon: {
                color: color.text._400,
                marginLeft: spacing.m,
                marginRight: spacing.m,
            },
            // @pseudo class, does not have a unique render rule
            bullet_list_content: {
                flex: 1,
            },
            // @pseudo class, does not have a unique render rule
            ordered_list_icon: {
                color: color.text._400,
                marginLeft: spacing.m,
                marginRight: spacing.m,
            },
            // @pseudo class, does not have a unique render rule
            ordered_list_content: {
                flex: 1,
            },

            // Code
            code_inline: {
                backgroundColor: color.neutral._200,
                paddingHorizontal: spacing.m,
                flex: 1,
                borderRadius: 4,
                ...Platform.select({
                    ios: {
                        fontFamily: 'Courier',
                    },
                    android: {
                        fontFamily: 'monospace',
                    },
                }),
            },
            code_block: {
                color: color.text._400,
                borderWidth: 1,
                borderColor: color.neutral._100,
                backgroundColor: color.neutral._200,
                padding: 4,
                borderRadius: 8,
                ...Platform.select({
                    ios: {
                        fontFamily: 'Courier',
                    },
                    android: {
                        fontFamily: 'monospace',
                    },
                }),
            },
            fence: {
                color: color.text._400,
                borderWidth: 1,
                borderColor: color.neutral._300,
                backgroundColor: color.neutral._300,
                paddingHorizontal: spacing.l,
                paddingVertical: spacing.m,
                marginVertical: spacing.m,
                borderRadius: borderRadius.m,
                ...Platform.select({
                    ios: {
                        fontFamily: 'Courier',
                    },
                    android: {
                        fontFamily: 'monospace',
                    },
                }),
            },

            // Tables
            table: {
                borderWidth: 1,
                borderColor: color.primary._200,
                borderRadius: borderRadius.m,
                marginBottom: spacing.m,
                overflow: 'hidden',
            },
            thead: {
                backgroundColor: color.neutral._100,
            },
            tbody: {
                backgroundColor: color.neutral._200,
            },
            th: {
                flex: 1,
                padding: 8,
            },
            tr: {
                borderBottomWidth: 1,
                borderColor: color.neutral._300,
                flexDirection: 'row',
            },
            td: {
                flex: 1,
                padding: 8,
            },

            // Links
            link: {
                textDecorationLine: 'underline',
            },
            blocklink: {
                flex: 1,
                borderColor: '#000000',
                borderBottomWidth: 1,
            },

            // Images
            image: {
                flex: 1,
            },

            // Text Output
            text: {},
            textgroup: {
                color: color.text._100,
            },
            paragraph: {
                flexWrap: 'wrap',
                flexDirection: 'row',
                alignItems: 'flex-start',
                justifyContent: 'flex-start',
                width: '100%',
                color: color.text._100,
                marginVertical: spacing.sm,
            },

            hardbreak: {
                width: '100%',
                height: 1,
                color: color.text._100,
            },
            softbreak: {},

            // Believe these are never used but retained for completeness
            pre: {},
            inline: {},
            span: {},
        })
    }
}
