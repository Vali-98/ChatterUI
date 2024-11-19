import { useInference } from '@constants/Chat'
import { Chats, Style, MarkdownStyle } from '@globals'
import { useEffect, useRef } from 'react'
import { LayoutChangeEvent, View } from 'react-native'
import Markdown from 'react-native-markdown-display'
import Animated, { useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated'
//@ts-expect-error
import AnimatedEllipsis from 'rn-animated-ellipsis'
import { useShallow } from 'zustand/react/shallow'

type ChatTextProps = {
    nowGenerating: boolean
    id: number
}

const ChatTextLast: React.FC<ChatTextProps> = ({ nowGenerating, id }) => {
    const { mes, swipeId } = Chats.useChat((state) => ({
        mes:
            state?.data?.messages?.[id]?.swipes?.[state?.data?.messages?.[id].swipe_id ?? -1]
                .swipe ?? '',

        swipeId:
            state?.data?.messages?.[id]?.swipes?.[state?.data?.messages?.[id].swipe_id ?? -1].id ??
            -1,
    }))

    const currentSwipeId = useInference((state) => state.currentSwipeId)

    const { buffer } = Chats.useChat(
        useShallow((state) => ({
            buffer: state.buffer,
        }))
    )

    /*
    const animatedHeight = useRef(new Animated.Value(-1)).current
    const height = useRef(-1)
    const handleAnimateHeight = (newheight: number) => {
        animatedHeight.stopAnimation(() =>
            Animated.timing(animatedHeight, {
                toValue: newheight,
                duration: 200,
                useNativeDriver: false,
                easing: Easing.inOut((x) => x * x),
            }).start()
        )
    }

    const handleContentSizeChange = (event: LayoutChangeEvent) => {
        console.log('handle')
        const newHeight = event.nativeEvent.layout.height
        const oveflowPadding = 12
        console.log(newHeight)
        if (height.current === -1) {
            height.current = newHeight
            animatedHeight.setValue(newHeight)
            return
        }

        if (height.current === newHeight) return
        height.current = newHeight
        const showPadding = nowGenerating && buffer !== ''
        handleAnimateHeight(newHeight + (showPadding ? oveflowPadding : 0))
    }

    useEffect(() => {
        if (!nowGenerating && height.current !== -1) {
            handleAnimateHeight(height.current)
        } else if (nowGenerating && !mes) {
            // NOTE: this assumes that mes is empty due to a swipe and may break, but unlikely
            height.current = 0
            handleAnimateHeight(height.current)
        }
    }, [nowGenerating])*/

    const animHeight = useSharedValue(-1)
    const targetHeight = useSharedValue(-1)
    const heightStyle = useAnimatedStyle(() =>
        animHeight.value < 0
            ? {}
            : {
                  height: withTiming(animHeight.value, { duration: 200 }),
              }
    )
    const viewRef = useRef<View>(null)
    const updateHeight = () => {
        const oveflowPadding = 12
        const showPadding = nowGenerating && buffer !== ''

        if (viewRef.current) {
            viewRef.current.measure((x, y, width, measuredHeight) => {
                const newHeight = measuredHeight + (showPadding ? oveflowPadding : 0)
                if (targetHeight.value === newHeight) return
                animHeight.value = newHeight
                targetHeight.value = newHeight
            })
        }
    }

    useEffect(() => {
        requestAnimationFrame(() => updateHeight())
    }, [buffer, mes])

    return (
        <Animated.View style={[heightStyle, { overflow: 'scroll' }]}>
            <View style={{ minHeight: 10 }} ref={viewRef}>
                {swipeId === currentSwipeId && nowGenerating && buffer === '' && (
                    <AnimatedEllipsis
                        style={{
                            color: Style.getColor('primary-text2'),
                            fontSize: 20,
                        }}
                    />
                )}
                <Markdown
                    markdownit={MarkdownStyle.Rules}
                    rules={MarkdownStyle.RenderRules}
                    style={MarkdownStyle.Styles}>
                    {nowGenerating && swipeId === currentSwipeId ? buffer.trim() : mes.trim()}
                </Markdown>
            </View>
        </Animated.View>
    )
}

export default ChatTextLast
