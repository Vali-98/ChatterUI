import { useInference } from '@constants/Chat'
import { Chats, MarkdownStyle, Style } from '@globals'
import { usePathname } from 'expo-router'
import { useEffect, useRef } from 'react'
import { View } from 'react-native'
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
    const viewRef = useRef<View>(null)

    const currentSwipeId = useInference((state) => state.currentSwipeId)

    const { buffer } = Chats.useChat(
        useShallow((state) => ({
            buffer: state.buffer,
        }))
    )

    const animHeight = useSharedValue(-1)
    const targetHeight = useSharedValue(-1)
    const heightStyle = useAnimatedStyle(() =>
        animHeight.value < 0
            ? {}
            : {
                  height: withTiming(animHeight.value, { duration: 200 }),
              }
    )
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

    // TODO: Remove once this is fixed:
    // https://github.com/software-mansion/react-native-reanimated/issues/6659

    const path = usePathname()

    return (
        <Animated.View style={[path === '/' ? heightStyle : {}, { overflow: 'scroll' }]}>
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
