import { setStringAsync } from 'expo-clipboard'
import { Image } from 'expo-image'
import { t } from 'i18next'
import { RaTeXView } from 'ratex-react-native'
import React, { ReactNode, useCallback, useMemo, useState } from 'react'
import { Platform, StyleSheet, Text, useWindowDimensions, View } from 'react-native'
import { MarkdownIt } from 'react-native-markdown-display'

import ThemedButton from '@components/buttons/ThemedButton'
import Accordion from '@components/views/Accordion'
import { ChatStyle } from '@lib/state/ChatStyle'
import { Logger } from '@lib/state/Logger'
import { Theme } from '@lib/theme/ThemeManager'

import latexPlugin from './MarkdownLatexPlugin'
import doubleQuotePlugin from './MarkdownQuotePlugin'
import thinkPlugin from './MarkdownThinkPlugin'

const getDeepASTDirection = (astNode: any): 'ltr' | 'rtl' | 'neutral' => {
    if (!astNode) return 'neutral'

    // Explicitly flag softbreaks or hardbreaks as neutral
    if (
        astNode.type === 'softbreak' ||
        astNode.type === 'hardbreak' ||
        astNode.type === 'double_quote'
    ) {
        return 'neutral'
    }

    if (astNode.type === 'text' && typeof astNode.content === 'string') {
        // If it's pure whitespace/newlines, it's neutral
        if (!astNode.content.trim()) return 'neutral'

        const rtlRegex = /[\u0591-\u07FF\uFB1D-\uFDFD\uFE70-\uFEFC]/
        return rtlRegex.test(astNode.content) ? 'rtl' : 'ltr'
    }

    if (Array.isArray(astNode.children)) {
        for (const childNode of astNode.children) {
            const dir = getDeepASTDirection(childNode)
            if (dir !== 'neutral') return dir // Return the first concrete direction found
        }
    }

    return 'neutral'
}

const ImageAdapter = ({
    node,
    children,
    parent,
    styles,
    allowedImageHandlers,
    defaultImageHandler,
}: {
    node: any
    children: any
    parent: any
    styles: any
    allowedImageHandlers: any
    defaultImageHandler: any
}) => {
    const [imageData, setImageData] = useState({ height: 0, aspectRatio: 1 })
    const { src, alt } = node.attributes

    const { width } = useWindowDimensions()
    // we check that the source starts with at least one of the elements in allowedImageHandlers
    const show =
        allowedImageHandlers.filter((value: string) => {
            return src.toLowerCase().startsWith(value.toLowerCase())
        }).length > 0

    if (show === false && defaultImageHandler === null) {
        return null
    }

    const imageProps: any = {
        indicator: true,
        style: styles._VIEW_SAFE_image,
        source: { uri: src },
    }

    if (alt) {
        imageProps.accessible = true
        imageProps.accessibilityLabel = alt
    }

    return (
        <View style={{ height: imageData.height }}>
            <Image
                key={node.key}
                {...imageProps}
                width={imageData.height}
                aspectRatio={imageData.aspectRatio}
                onLoad={(data) => {
                    setImageData({
                        height: Math.min(width - 100, data.source.width),
                        aspectRatio: data.source.width / data.source.height,
                    })
                }}
                contentFit="contain"
            />
        </View>
    )
}

export namespace MarkdownStyle {
    export const Rules = MarkdownIt({ typographer: true })
        .use(thinkPlugin)
        .use(doubleQuotePlugin)
        .use(latexPlugin)

    export const RenderRules: Record<string, (...props: any) => ReactNode> = {
        fence: (node: any, children: any, parent: any, styles: any, inheritedStyles = {}) => {
            let { content, sourceInfo } = node
            if (
                typeof node.content === 'string' &&
                node.content.charAt(node.content.length - 1) === '\n'
            ) {
                content = node.content.substring(0, node.content.length - 1)
            }
            return (
                <View key={node.key}>
                    <View style={styles.fenceHeader}>
                        <Text style={{ color: styles.fenceHeader.color }}>
                            {sourceInfo || 'Code'}
                        </Text>
                        {content && (
                            <ThemedButton
                                iconName="copy"
                                variant="tertiary"
                                iconStyle={{ color: styles.fenceHeader.color }}
                                onPress={() => {
                                    setStringAsync(content)
                                        .then(() => {
                                            Logger.infoToast(
                                                t('chat.quickActions.toast.copiedCode')
                                            )
                                        })
                                        .catch(() => {
                                            Logger.errorToast(
                                                t('chat.quickActions.toast.copyFailed')
                                            )
                                        })
                                }}
                            />
                        )}
                    </View>
                    <Text style={[inheritedStyles, styles.fence]}>{content}</Text>
                </View>
            )
        },
        double_quote: (node: any, children: any, parent: any, styles: any) => {
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
                <Text key={node.key} style={styles.double_quote}>
                    {open}
                    {children}
                    {close}
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
        latex_block: (node: any, children: any, parent: any, styles: any) => {
            const { content } = node
            return (
                <RaTeXView
                    latex={content ?? ''}
                    key={node.key}
                    style={styles.latex_block}
                    color={styles.latex_block.color ?? 'white'}
                />
            )
        },
        latex_inline: (node: any, children: any, parent: any, styles: any) => {
            const { content } = node
            return (
                <RaTeXView
                    latex={content ?? ''}
                    key={node.key}
                    style={styles.latex_block}
                    color={styles.latex_block.color ?? 'white'}
                />
            )
        },

        textgroup: (node: any, children: any, parent: any, styles: any) => {
            const astChildrenArray = node.children || []
            const renderedChildrenArray = React.Children.toArray(children)

            const componentRuns: any[] = []
            let currentRunAst: any[] = []
            let currentRunRendered: any[] = []

            // Start with a fallback default, but it will update on the first non-neutral node
            let currentDir: 'ltr' | 'rtl' = 'ltr'
            let isFirstNode = true
            astChildrenArray.forEach((astChild: any, index: number) => {
                const renderedChild = renderedChildrenArray[index]
                if (!renderedChild) return

                let childDir = getDeepASTDirection(astChild)

                // If the node is neutral (like a softbreak), force it to adopt the current running direction
                if (childDir === 'neutral') {
                    childDir = currentDir
                }

                if (isFirstNode) {
                    currentDir = childDir
                    isFirstNode = false
                    currentRunAst.push(astChild)
                    currentRunRendered.push(renderedChild)
                } else if (childDir === currentDir) {
                    currentRunAst.push(astChild)
                    currentRunRendered.push(renderedChild)
                } else {
                    // A genuine direction switch happened (LTR <-> RTL)
                    componentRuns.push({
                        direction: currentDir,
                        renderedChildren: currentRunRendered,
                    })
                    currentDir = childDir
                    currentRunAst = [astChild]
                    currentRunRendered = [renderedChild]
                }
            })

            if (currentRunRendered.length > 0) {
                componentRuns.push({
                    direction: currentDir,
                    renderedChildren: currentRunRendered,
                })
            }

            return (
                <View key={node.key} style={{ width: '100%', flexWrap: 'wrap' }}>
                    {componentRuns.map((run, index) => {
                        const isRtl = run.direction === 'rtl'

                        return (
                            <Text
                                key={`run-${index}`}
                                style={[
                                    styles.textgroup,
                                    {
                                        flexWrap: 'wrap',
                                        width: '100%',
                                        writingDirection: run.direction,
                                        textAlign: isRtl ? 'right' : 'left',
                                    },
                                ]}>
                                {isRtl ? '\u2067' : '\u2066'}
                                {run.renderedChildren}
                                {'\u2069'}
                            </Text>
                        )
                    })}
                </View>
            )
        },
        inline: (node: any, children: any, parent: any, styles: any) => {
            return (
                <Text key={node.key} style={[styles.inline, { flexWrap: 'wrap', width: '100%' }]}>
                    {children}
                </Text>
            )
        },
        image: (
            node: any,
            children: any,
            parent: any,
            styles: any,
            allowedImageHandlers: any,
            defaultImageHandler: any
        ) => {
            return (
                <ImageAdapter
                    key={node.key}
                    node={node}
                    parent={parent}
                    styles={styles}
                    allowedImageHandlers={allowedImageHandlers}
                    defaultImageHandler={defaultImageHandler}>
                    {children}
                </ImageAdapter>
            )
        },
    }

    export const useCustomFormatting = () => {
        const mdStyle = useMarkdownStyle()

        const { markdown, rules, style } = useMemo(
            () => ({
                markdown: Rules,
                rules: RenderRules,
                style: mdStyle,
            }),
            [mdStyle]
        )
        return { markdown, rules, style }
    }

    export const useMarkdownStyle = () => {
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
                    double_quote: { color: color.quote },
                    // The main container
                    body: {
                        textAlign: 'auto',
                    },

                    // Headings
                    heading1: {
                        flexDirection: 'row',
                        fontSize: getModifiedFontSize(32),
                        color: color.text._100,
                        fontWeight: getModifiedFontWeight(500),
                    },
                    heading2: {
                        flexDirection: 'row',
                        fontSize: getModifiedFontSize(24),
                        color: color.text._100,
                        fontWeight: getModifiedFontWeight(500),
                    },
                    heading3: {
                        flexDirection: 'row',
                        fontSize: getModifiedFontSize(18),
                        color: color.text._100,
                        fontWeight: getModifiedFontWeight(500),
                    },
                    heading4: {
                        flexDirection: 'row',
                        fontSize: getModifiedFontSize(16),
                        color: color.text._100,
                        fontWeight: getModifiedFontWeight(500),
                    },
                    heading5: {
                        flexDirection: 'row',
                        fontSize: getModifiedFontSize(13),
                        color: color.text._100,
                        fontWeight: getModifiedFontWeight(500),
                    },
                    heading6: {
                        flexDirection: 'row',
                        fontSize: getModifiedFontSize(11),
                        color: color.text._100,
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
                        color: color.text._300,
                        backgroundColor: color.neutral._100,
                        borderColor: color.neutral._200,
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
                        color: color.text._300,
                        flexDirection: 'row',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        paddingVertical: 4,
                        paddingHorizontal: 12,
                        backgroundColor: color.neutral._200,
                        borderTopLeftRadius: borderRadius.m,
                        borderTopRightRadius: borderRadius.m,
                        marginTop: spacing.sm,
                    },

                    // Tables
                    table: {
                        borderWidth: 2,
                        borderColor: color.neutral._300,
                        borderRadius: borderRadius.m,
                        marginBottom: spacing.m,
                        overflow: 'hidden',
                    },
                    thead: {
                        backgroundColor: color.neutral._300,
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
                        fontSize: getModifiedFontSize(14),
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
                        minWidth: 30,
                        minHeight: 30,
                    },

                    // Text Output
                    text: {},

                    textgroup: {
                        fontWeight: getModifiedFontWeight(400),
                        color: color.text._100,
                        width: '100%',
                    },
                    latex_inline: {
                        color: color.text._300,
                        fontSize: getModifiedFontSize(16),
                    },
                    latex_block: {
                        color: color.text._300,
                        fontSize: getModifiedFontSize(16),
                        marginTop: spacing.l,
                        marginBottom: spacing.sm,
                    },
                    paragraph: {
                        flexWrap: 'wrap',
                        textAlign: 'auto',
                        color: color.text._100,
                        marginVertical: spacing.sm,
                        fontSize: getModifiedFontSize(14),
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
                }),
            [color, spacing, borderRadius, getModifiedFontSize, getModifiedFontWeight]
        )
    }
}
