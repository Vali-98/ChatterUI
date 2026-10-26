import { useCallback, useEffect, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Animated, Easing, useAnimatedValue, View } from 'react-native'
import Markdown from 'react-native-markdown-display'

import ThemedButton from '@components/buttons/ThemedButton'
import AnimatedEllipsis from '@components/text/AnimatedEllipsis'
import { ChatSwipe } from '@db/schema'
import { useSwipeGeneration } from '@lib/engine/generation/hooks'
import { finishGeneration } from '@lib/engine/generation/lifecycle'
import { useTextFilter } from '@lib/hooks/TextFilter'
import { MarkdownStyle } from '@lib/markdown/Markdown'
import { Logger } from '@lib/state/Logger'

type ChatTextProps = {
    isGenerating: boolean
    swipe: ChatSwipe
}

const ChatTextLast: React.FC<ChatTextProps> = ({ isGenerating, swipe }) => {
    const { t } = useTranslation()
    const { markdown, rules, style } = MarkdownStyle.useCustomFormatting()

    const generation = useSwipeGeneration(swipe.id)
    const buffer = { data: generation?.text ?? swipe.swipe }
    const [showHidden, setShowHidden] = useState(false)
    const viewRef = useRef<View>(null)
    const currentSwipeId = generation?.swipeId
    const animHeight = useAnimatedValue(-1)
    const targetHeight = useRef(-1)
    const firstRender = useRef(true)

    const updateHeight = useCallback(() => {
        viewRef.current?.measure((_, __, ___, measuredHeight) => {
            if (firstRender.current) {
                firstRender.current = false
                animHeight.setValue(measuredHeight)
                return
            }
            const showPadding = isGenerating && buffer.data
            const overflowPadding = showPadding ? 12 : 0
            const newHeight = measuredHeight + overflowPadding

            if (targetHeight.current === newHeight) return
            if (targetHeight.current > -1) animHeight.setValue(targetHeight.current)

            animHeight.stopAnimation(() =>
                Animated.timing(animHeight, {
                    toValue: newHeight,
                    duration: 300 * Math.max(1, Math.abs(newHeight - targetHeight.current) / 1000),
                    useNativeDriver: false,
                    easing: Easing.inOut((x) => x * x),
                }).start()
            )
            targetHeight.current = newHeight
        })
    }, [animHeight, buffer.data, isGenerating])

    useEffect(() => {
        if (!isGenerating && !firstRender.current) {
            setTimeout(() => updateHeight(), 400)
        }
    }, [isGenerating, updateHeight])

    const filteredText = useTextFilter(swipe.swipe ?? '')
    const renderedText = showHidden ? swipe.swipe : filteredText.result

    return (
        <Animated.View style={{ overflow: 'scroll', height: animHeight }}>
            <View style={{ minHeight: 10 }} ref={viewRef} onLayout={updateHeight}>
                {swipe.id === currentSwipeId && isGenerating && buffer.data === '' && (
                    <AnimatedEllipsis />
                )}
                <Markdown mergeStyle={false} markdownit={markdown} rules={rules} style={style}>
                    {generation ? buffer.data.trim() : renderedText}
                </Markdown>
                {generation?.error && !generation.persisted && (
                    <ThemedButton
                        label={t('common.actions.save')}
                        onPress={() => {
                            void finishGeneration(generation.id, 'failed').catch(Logger.stackTrace)
                        }}
                    />
                )}
                {filteredText.found && (
                    <View style={{ flexDirection: 'row' }}>
                        <ThemedButton
                            onPress={() => setShowHidden(!showHidden)}
                            variant="secondary"
                            label={
                                showHidden
                                    ? t('chat.filteredText.hide')
                                    : t('chat.filteredText.show')
                            }
                            labelStyle={{ flex: 0, fontSize: 12 }}
                            buttonStyle={{
                                paddingVertical: 0,
                                paddingHorizontal: 0,
                                borderWidth: 0,
                            }}
                        />
                    </View>
                )}
            </View>
        </Animated.View>
    )
}

export default ChatTextLast
