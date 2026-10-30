import React, { useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Animated, Easing, useAnimatedValue, View } from 'react-native'
import Markdown from 'react-native-markdown-display'

import ThemedButton from '@components/buttons/ThemedButton'
import { useTextFilter } from '@lib/hooks/TextFilter'
import { MarkdownStyle } from '@lib/markdown/Markdown'
import { Theme } from '@lib/theme/ThemeManager'

import ChatReasoning from './ChatReasoning'

type ChatTextProps = {
    reasoning?: string
    swipeText: string
}

const ChatText: React.FC<ChatTextProps> = ({ swipeText, reasoning }) => {
    const { t } = useTranslation()
    const { spacing } = Theme.useTheme()
    const { markdown, rules, style } = MarkdownStyle.useCustomFormatting()
    const [showHidden, setShowHidden] = useState(false)
    const viewRef = useRef<View>(null)
    const animHeight = useAnimatedValue(-1)
    const targetHeight = useRef(-1)
    const firstRender = useRef(true)

    const handleAnimateHeight = (newheight: number) => {
        animHeight.stopAnimation(() =>
            Animated.timing(animHeight, {
                toValue: newheight,
                duration: 150,
                useNativeDriver: false,
                easing: Easing.inOut((x) => x * x),
            }).start()
        )
    }
    const updateHeight = () => {
        viewRef.current?.measure((_, __, ___, measuredHeight) => {
            if (firstRender.current) {
                animHeight.setValue(measuredHeight)
                return (firstRender.current = false)
            }
            if (targetHeight.current === measuredHeight) return
            if (targetHeight.current > -1) animHeight.setValue(targetHeight.current)
            handleAnimateHeight(measuredHeight)
            targetHeight.current = measuredHeight
        })
    }

    const filteredReasoning = useTextFilter(reasoning ?? '')
    const renderedReasoning = showHidden ? reasoning : filteredReasoning.result
    const filteredText = useTextFilter(swipeText?.trim() ?? '')
    const renderedText = showHidden ? swipeText?.trim() : filteredText.result
    return (
        <Animated.View style={{ overflow: 'scroll', height: animHeight }}>
            <View style={{ minHeight: 10 }} ref={viewRef} onLayout={updateHeight}>
                {renderedReasoning ? <ChatReasoning content={renderedReasoning} /> : null}
                <View style={{ paddingHorizontal: spacing.m, paddingVertical: spacing.sm }}>
                    <Markdown mergeStyle={false} markdownit={markdown} rules={rules} style={style}>
                        {renderedText}
                    </Markdown>
                    {(filteredText.found || filteredReasoning.found) && (
                        <View style={{ flexDirection: 'row' }}>
                            <ThemedButton
                                onPress={() => setShowHidden(!showHidden)}
                                variant="tertiary"
                                label={
                                    showHidden
                                        ? t('chat.filteredText.hide')
                                        : t('chat.filteredText.show')
                                }
                                labelStyle={{ flex: 0, fontSize: 12 }}
                                viewStyle={{
                                    paddingVertical: 0,
                                    paddingHorizontal: 0,
                                }}
                            />
                        </View>
                    )}
                </View>
            </View>
        </Animated.View>
    )
}

export default ChatText
