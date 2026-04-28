import { useCallback, useEffect, useRef, useState } from 'react'
import { Animated, Easing, useAnimatedValue, View } from 'react-native'
import Markdown from 'react-native-markdown-display'

import ThemedButton from '@components/buttons/ThemedButton'
import AnimatedEllipsis from '@components/text/AnimatedEllipsis'
import { useTextFilter } from '@lib/hooks/TextFilter'
import { MarkdownStyle } from '@lib/markdown/Markdown'
import { Chats, useInference } from '@lib/state/Chat'
import { ChatSwipe } from 'db/schema'

type ChatTextProps = {
    nowGenerating: boolean
    swipe: ChatSwipe
}

const ChatTextLast: React.FC<ChatTextProps> = ({ nowGenerating, swipe }) => {
    const { markdown, rules, style } = MarkdownStyle.useCustomFormatting()

    const { buffer } = Chats.useBuffer()
    const [showHidden, setShowHidden] = useState(false)
    const viewRef = useRef<View>(null)
    const currentSwipeId = useInference((state) => state.currentSwipeId)
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
            const showPadding = nowGenerating && buffer.data
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
    }, [animHeight, buffer.data, nowGenerating])

    useEffect(() => {
        if (!nowGenerating && !firstRender.current) {
            setTimeout(() => updateHeight(), 400)
        }
    }, [nowGenerating, updateHeight])

    const filteredText = useTextFilter(swipe.swipe ?? '')
    const renderedText = showHidden ? swipe.swipe : filteredText.result

    return (
        <Animated.View style={{ overflow: 'scroll', height: animHeight }}>
            <View style={{ minHeight: 10 }} ref={viewRef} onLayout={updateHeight}>
                {swipe.id === currentSwipeId && nowGenerating && buffer.data === '' && (
                    <AnimatedEllipsis />
                )}
                <Markdown mergeStyle={false} markdownit={markdown} rules={rules} style={style}>
                    {nowGenerating && swipe.id === currentSwipeId
                        ? buffer.data.trim()
                        : renderedText}
                </Markdown>
                {filteredText.found && (
                    <View style={{ flexDirection: 'row' }}>
                        <ThemedButton
                            onPress={() => setShowHidden(!showHidden)}
                            variant="secondary"
                            label={showHidden ? 'Hide Filtered' : 'Show Filtered'}
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
