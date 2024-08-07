import { Style } from './Style'
import React from 'react'
import { Text } from 'react-native'
import SimpleMarkdown from 'simple-markdown'

export namespace MarkdownStyle {
    const speechStyle = { color: '#e69d17' }
    export const Rules = {
        order: SimpleMarkdown.defaultRules.em.order + 0.6,
        match(source: string, state: any, lookbehind: any) {
            return /^"([\s\S]+?)"(?!")/.exec(source)
        },
        parse(capture: any, parse: any, state: any) {
            return {
                content: parse(capture[1], state),
            }
        },
        react(node: any, output: any, { ...state }) {
            state.withinText = true
            state.style = {
                ...(state.style || {}),
                ...speechStyle,
            }
            return React.createElement(
                Text,
                {
                    key: state.key,
                    style: speechStyle,
                },
                `"`,
                output(node.content, state),
                `"`
            )
        },
        html: undefined,
    }
    export const Format = {
        em: {
            color: Style.getColor('primary-text2'),
            fontStyle: 'italic',
        },
        text: {
            color: Style.getColor('primary-text1'),
        },
        list: {
            //color: Style.getColor('primary-text1'),
            flex: 1,
            paddingBottom: 8,
        },
        inlineCode: {
            color: Style.getColor('primary-text2'),
            backgroundColor: Style.getColor('primary-surface2'),
            padding: 16,
            borderRadius: 4,
        },
        listItemText: {
            color: Style.getColor('primary-text2'),
        },
        listItemBullet: {
            color: Style.getColor('primary-text2'),
        },
        listItemNumber: {
            color: Style.getColor('primary-text2'),
        },
    }
}
