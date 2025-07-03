import ThemedButton from '@components/buttons/ThemedButton'
import AnimatedEllipsis from '@components/text/AnimatedEllipsis'
import { useTextFilter } from '@lib/hooks/TextFilter'
import { MarkdownStyle } from '@lib/markdown/Markdown'
import { Chats, useInference } from '@lib/state/Chat'
import { useEffect, useRef, useState } from 'react'
import { View, Animated, Easing, useAnimatedValue } from 'react-native'
import Markdown from 'react-native-markdown-display'

type ChatTextProps = {
    nowGenerating: boolean
    index: number
}

const ChatTextLast: React.FC<ChatTextProps> = ({ nowGenerating, index }) => {
    const { markdown, rules, style } = MarkdownStyle.useCustomFormatting()

    const { swipeText, swipeId } = Chats.useSwipeData(index)
    const { buffer } = Chats.useBuffer()

    const [showHidden, setShowHidden] = useState(false)
    const viewRef = useRef<View>(null)
    const currentSwipeId = useInference((state) => state.currentSwipeId)
    const animHeight = useAnimatedValue(-1)
    const targetHeight = useRef(-1)
    const firstRender = useRef(true)

    const handleAnimateHeight = (newheight: number) => {
        animHeight.stopAnimation(() =>
            Animated.timing(animHeight, {
                toValue: newheight,
                duration: 300,
                useNativeDriver: false,
                easing: Easing.inOut((x) => x * x),
            }).start()
        )
    }

    const updateHeight = () => {
        if (firstRender.current) return (firstRender.current = false)
        const showPadding = nowGenerating && buffer.data
        const overflowPadding = showPadding ? 12 : 0
        if (viewRef.current) {
            viewRef.current.measure((x, y, width, measuredHeight) => {
                const newHeight = measuredHeight + overflowPadding
                if (targetHeight.current === newHeight) return
                if (targetHeight.current > -1) animHeight.setValue(targetHeight.current)
                handleAnimateHeight(newHeight)
                targetHeight.current = newHeight
            })
        }
    }

    useEffect(() => {
        if (!nowGenerating && !firstRender.current) setTimeout(() => updateHeight(), 400)
    }, [nowGenerating])

    const filteredText = useTextFilter(swipeText?.trim() ?? '')
    const renderedText = showHidden ? swipeText?.trim() : filteredText.result
    return (
        <Animated.View style={{ overflow: 'scroll', height: animHeight }}>
            <View style={{ minHeight: 10 }} ref={viewRef} onLayout={updateHeight}>
                {swipeId === currentSwipeId && nowGenerating && buffer.data === '' && (
                    <AnimatedEllipsis />
                )}
                <Markdown mergeStyle={false} markdownit={markdown} rules={rules} style={style}>
                    {nowGenerating && swipeId === currentSwipeId
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
