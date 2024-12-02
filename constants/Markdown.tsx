import React, { ReactNode } from 'react'
import { Platform, StyleSheet, Text } from 'react-native'
import { MarkdownIt } from 'react-native-markdown-display'

import doubleQuotePlugin from './MarkdownQuotePlugin'
import { Style } from './Style'

export namespace MarkdownStyle {
    const speechStyle = { color: '#e69d17' }

    export const Rules = MarkdownIt({ typographer: true }).use(doubleQuotePlugin)

    export const RenderRules = {
        double_quote: (node: any, children: any, parent: any, styles: any) => {
            return (
                <Text key={node.key} style={styles.double_quote}>
                    "{children}"
                </Text>
            )
        },
    }

    export const Styles = StyleSheet.create({
        double_quote: speechStyle,
        // The main container
        body: {},

        // Headings
        heading1: {
            flexDirection: 'row',
            fontSize: 32,
            color: Style.getColor('primary-text1'),
        },
        heading2: {
            flexDirection: 'row',
            fontSize: 24,
            color: Style.getColor('primary-text1'),
        },
        heading3: {
            flexDirection: 'row',
            fontSize: 18,
            color: Style.getColor('primary-text1'),
        },
        heading4: {
            flexDirection: 'row',
            fontSize: 16,
            color: Style.getColor('primary-text1'),
        },
        heading5: {
            flexDirection: 'row',
            fontSize: 13,
            color: Style.getColor('primary-text1'),
        },
        heading6: {
            flexDirection: 'row',
            fontSize: 11,
            color: Style.getColor('primary-text1'),
        },

        // Horizontal Rule
        hr: {
            backgroundColor: Style.getColor('primary-brand'),
            height: 1,
            marginTop: 8,
        },

        // Emphasis
        strong: {
            fontWeight: 'bold',
            color: Style.getColor('primary-text1'),
        },
        em: {
            fontStyle: 'italic',
            color: Style.getColor('primary-text2'),
        },
        s: {
            textDecorationLine: 'line-through',
            color: Style.getColor('primary-text2'),
        },

        // Blockquotes
        blockquote: {
            backgroundColor: Style.getColor('primary-surface2'),
            borderColor: Style.getColor('primary-brand'),
            borderLeftWidth: 4,
            marginLeft: 5,
            paddingHorizontal: 5,
            color: Style.getColor('primary-text2'),
        },

        // Lists
        bullet_list: {
            marginVertical: 4,
        },
        ordered_list: {
            marginVertical: 4,
        },
        list_item: {
            flexDirection: 'row',
            justifyContent: 'flex-start',
            color: Style.getColor('primary-text1'),
        },
        // @pseudo class, does not have a unique render rule
        bullet_list_icon: {
            color: Style.getColor('primary-text2'),
            marginLeft: 10,
            marginRight: 10,
        },
        // @pseudo class, does not have a unique render rule
        bullet_list_content: {
            flex: 1,
        },
        // @pseudo class, does not have a unique render rule
        ordered_list_icon: {
            color: Style.getColor('primary-text2'),
            marginLeft: 10,
            marginRight: 10,
        },
        // @pseudo class, does not have a unique render rule
        ordered_list_content: {
            flex: 1,
        },

        // Code
        code_inline: {
            borderWidth: 1,
            borderColor: Style.getColor('primary-surface1'),
            backgroundColor: Style.getColor('primary-surface2'),
            padding: 10,
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
            color: Style.getColor('primary-text2'),
            borderWidth: 1,
            borderColor: Style.getColor('primary-surface1'),
            backgroundColor: Style.getColor('primary-surface2'),
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
            color: Style.getColor('primary-text2'),
            borderWidth: 1,
            borderColor: Style.getColor('primary-surface1'),
            backgroundColor: Style.getColor('primary-surface2'),
            borderRadius: 4,
            ...Platform.select({
                ios: {
                    fontFamily: 'Courier',
                },
                android: {
                    fontFamily: 'monospace',
                },
            }),
            marginVertical: 4,
        },

        // Tables
        table: {
            borderWidth: 1,
            borderColor: Style.getColor('primary-brand'),
            borderRadius: 3,
            marginBottom: 8,
        },
        thead: {
            backgroundColor: Style.getColor('primary-surface1'),
        },
        tbody: {
            backgroundColor: Style.getColor('primary-surface2'),
        },
        th: {
            flex: 1,
            padding: 8,
        },
        tr: {
            borderBottomWidth: 1,
            borderColor: Style.getColor('primary-surface3'),
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
            color: Style.getColor('primary-text1'),
        },
        paragraph: {
            marginTop: 10,
            marginBottom: 10,
            flexWrap: 'wrap',
            flexDirection: 'row',
            alignItems: 'flex-start',
            justifyContent: 'flex-start',
            width: '100%',
            color: Style.getColor('primary-text1'),
        },
        hardbreak: {
            width: '100%',
            height: 1,
            color: Style.getColor('primary-text1'),
        },
        softbreak: {},

        // Believe these are never used but retained for completeness
        pre: {},
        inline: {},
        span: {},
    })
}
