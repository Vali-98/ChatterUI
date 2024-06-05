import { Style } from './Style'
import React from 'react'
import { Platform, Text } from 'react-native'
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

        //List
        list: {
            //color: Style.getColor('primary-text1'),
            flex: 1,
            paddingBottom: 8,
        },
        listItemText: {
            color: Style.getColor('primary-text2'),
        },
        listItemBullet: {
            color: Style.getColor('primary-text3'),
        },
        listItemNumber: {
            color: Style.getColor('primary-text3'),
        },

        inlineCode: {
            fontFamily: Platform.OS === 'ios' ? 'Courier' : 'Monospace',
            color: Style.getColor('primary-text3'),
            backgroundColor: Style.getColor('primary-surface2'),
            borderColor: Style.getColor('primary-brand'),
            paddingHorizontal: 8,
            paddingVertical: 4,
            borderWidth: 1,
            borderRadius: 4,
        },
        // CODE
        codeBlock: {
            fontFamily: Platform.OS === 'ios' ? 'Courier' : 'Monospace',
            backgroundColor: Style.getColor('primary-surface2'),
            color: Style.getColor('primary-text2'),
            borderColor: Style.getColor('primary-surface4'),
            paddingHorizontal: 16,
            paddingVertical: 12,
            borderWidth: 1,
            borderRadius: 8,
        },
        autolink: {
            color: Style.getColor('primary-brand'),
        },

        // TABLES

        table: {
            borderWidth: 1,
            borderColor: Style.getColor('primary-brand'),
            borderRadius: 8,
            marginBottom: 16,
        },
        tableHeader: {
            backgroundColor: Style.getColor('primary-surface2'),
            flexDirection: 'row',
            justifyContent: 'space-around',
            borderTopLeftRadius: 8,
            borderTopRightRadius: 8,
        },
        tableHeaderCell: {
            color: Style.getColor('primary-text1'),
            fontWeight: 'bold',
            padding: 5,
        },
        tableRow: {
            backgroundColor: Style.getColor('primary-surface4'),
            borderColor: Style.getColor('primary-surface3'),
            borderBottomWidth: 1,
            flexDirection: 'row',
            justifyContent: 'space-around',
        },
        tableRowLast: {
            borderColor: 'transparent',
            borderBottomLeftRadius: 8,
            borderBottomRightRadius: 8,
            paddingBottom: 8,
        },
        tableRowCell: {
            padding: 5,
            flex: 1,
        },
    }
}
