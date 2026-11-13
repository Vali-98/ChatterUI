import { useCallback, useMemo } from 'react'
import { Platform, StyleSheet } from 'react-native'

import { ChatStyle } from '@lib/state/ChatStyle'
import { Theme } from '@lib/theme/ThemeManager'

export const useMarkdownStyles = () => {
    const { color, spacing, borderRadius } = Theme.useTheme()
    const { fontSize, textWeight } = ChatStyle.useChatStyle()

    const getModifiedFontSize = useCallback(
        (size: number) =>
            Math.max(ChatStyle.MIN_FONT_SIZE, ChatStyle.sizeModifierMap[fontSize] + size),
        [fontSize]
    )

    const getModifiedFontWeight = useCallback(
        (weight: number) => {
            const newWeight = Math.max(
                200,
                Math.min(900, weight + (ChatStyle.weightModifierMap?.[textWeight] ?? 0))
            )
            return `${newWeight}` as any
        },
        [textWeight]
    )

    return useMemo(
        () =>
            StyleSheet.create({
                double_quote: { color: color.chat.markdown.quote },
                // The main container
                body: {
                    color: color.chat.text,
                    textAlign: 'auto',
                    gap: 0,
                },

                // Headings
                heading1: {
                    color: color.chat.text,
                    flexDirection: 'row',
                    fontSize: getModifiedFontSize(32),
                    fontWeight: getModifiedFontWeight(500),
                },
                heading2: {
                    color: color.chat.text,
                    flexDirection: 'row',
                    fontSize: getModifiedFontSize(24),
                    fontWeight: getModifiedFontWeight(500),
                },
                heading3: {
                    color: color.chat.text,
                    flexDirection: 'row',
                    fontSize: getModifiedFontSize(18),
                    fontWeight: getModifiedFontWeight(500),
                },
                heading4: {
                    color: color.chat.text,
                    flexDirection: 'row',
                    fontSize: getModifiedFontSize(16),
                    fontWeight: getModifiedFontWeight(500),
                },
                heading5: {
                    color: color.chat.text,
                    flexDirection: 'row',
                    fontSize: getModifiedFontSize(13),
                    fontWeight: getModifiedFontWeight(500),
                },
                heading6: {
                    color: color.chat.text,
                    flexDirection: 'row',
                    fontSize: getModifiedFontSize(11),
                    fontWeight: getModifiedFontWeight(500),
                },

                // Horizontal Rule
                hr: {
                    backgroundColor: color.primary._500,
                    height: 1,
                    marginTop: spacing.m,
                },

                // Emphasis
                strong: {
                    fontWeight: getModifiedFontWeight(700),
                },
                em: {
                    fontStyle: 'italic',
                    color: color.chat.markdown.emphasis,
                },
                s: {
                    textDecorationLine: 'line-through',
                    color: color.chat.metadata,
                },

                // Blockquotes
                blockquote: {
                    backgroundColor: color.chat.markdown.blockquote.background,
                    borderColor: color.chat.markdown.blockquote.border,
                    borderLeftWidth: 4,
                    marginLeft: spacing.sm,
                    paddingHorizontal: spacing.sm,
                    color: color.chat.markdown.blockquote.text,
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
                },
                // @pseudo class, does not have a unique render rule
                bullet_list_icon: {
                    color: color.chat.metadata,
                    marginLeft: spacing.m,
                    marginRight: spacing.m,
                },
                // @pseudo class, does not have a unique render rule
                bullet_list_content: {
                    flex: 1,
                },
                // @pseudo class, does not have a unique render rule
                ordered_list_icon: {
                    color: color.chat.metadata,
                    marginLeft: spacing.m,
                    marginRight: spacing.m,
                },
                // @pseudo class, does not have a unique render rule
                ordered_list_content: {
                    flex: 1,
                },

                // Code
                code_inline: {
                    color: color.chat.markdown.inlineCode.text,
                    backgroundColor: color.chat.markdown.inlineCode.background,
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
                    color: color.chat.markdown.codeBlock.text,
                    borderWidth: 1,
                    borderColor: color.chat.markdown.codeBlock.headerBackground,
                    backgroundColor: color.chat.markdown.codeBlock.background,
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
                    color: color.chat.markdown.codeBlock.text,
                    backgroundColor: color.chat.markdown.codeBlock.background,
                    borderColor: color.chat.markdown.codeBlock.headerBackground,
                    borderWidth: 2,
                    paddingLeft: spacing.l,
                    paddingRight: spacing.l,
                    paddingVertical: spacing.m,
                    marginBottom: spacing.m,
                    borderBottomLeftRadius: borderRadius.m,
                    borderBottomRightRadius: borderRadius.m,
                    ...Platform.select({
                        ios: {
                            fontFamily: 'Courier',
                        },
                        android: {
                            fontFamily: 'monospace',
                        },
                    }),
                },

                fenceHeader: {
                    color: color.chat.markdown.codeBlock.headerText,
                    flexDirection: 'row',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    paddingVertical: 4,
                    paddingHorizontal: 12,
                    backgroundColor: color.chat.markdown.codeBlock.headerBackground,
                    borderTopLeftRadius: borderRadius.m,
                    borderTopRightRadius: borderRadius.m,
                    marginTop: spacing.sm,
                },

                // Tables
                table: {
                    borderWidth: 2,
                    borderColor: color.chat.markdown.table.border,
                    borderRadius: borderRadius.m,
                    marginBottom: spacing.m,
                    overflow: 'hidden',
                },
                thead: {
                    backgroundColor: color.chat.markdown.table.headerBackground,
                },
                tbody: {
                    backgroundColor: color.chat.markdown.table.background,
                },
                th: {
                    color: color.chat.text,
                    fontSize: getModifiedFontSize(14),
                    fontWeight: getModifiedFontWeight(700),
                    flex: 1,
                    padding: 8,
                },
                tr: {
                    borderBottomWidth: 1,
                    borderColor: color.chat.markdown.table.border,
                    flexDirection: 'row',
                    fontSize: getModifiedFontSize(14),
                },
                td: {
                    color: color.chat.text,
                    fontSize: getModifiedFontSize(14),
                    fontWeight: getModifiedFontWeight(400),
                    flex: 1,
                    padding: 8,
                },

                // Links
                link: {
                    color: color.chat.markdown.link,
                    textDecorationLine: 'underline',
                },
                blocklink: {
                    flex: 1,
                    borderColor: color.chat.markdown.link,
                    borderBottomWidth: 1,
                },

                // Images
                image: {
                    flex: 1,
                    minWidth: 30,
                    minHeight: 30,
                },

                // Text Output
                text: {},

                textgroup: {
                    fontWeight: getModifiedFontWeight(400),
                    width: '100%',
                },
                latex_inline: {
                    color: color.chat.text,
                    fontSize: getModifiedFontSize(16),
                },
                latex_block: {
                    color: color.chat.text,
                    fontSize: getModifiedFontSize(16),
                    marginTop: spacing.l,
                    marginBottom: spacing.sm,
                },
                paragraph: {
                    color: color.chat.text,
                    fontWeight: getModifiedFontWeight(400),
                    flexWrap: 'wrap',
                    textAlign: 'auto',
                    marginVertical: spacing.sm,
                    fontSize: getModifiedFontSize(14),
                },

                hardbreak: {
                    width: '100%',
                    height: 1,
                },
                softbreak: {},

                // Believe these are never used but retained for completeness
                pre: {},
                inline: {},
                span: {},
            }),
        [color, spacing, borderRadius, getModifiedFontSize, getModifiedFontWeight]
    )
}
