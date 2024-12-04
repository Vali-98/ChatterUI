import AnimatedEllipsis from '@components/AnimatedEllipsis'
import { useInference } from 'constants/Chat'
import { Chats, MarkdownStyle } from 'constants/Global'
import { useEffect, useRef } from 'react'
import { View, Animated, Easing, useAnimatedValue } from 'react-native'
import Markdown from 'react-native-markdown-display'
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
        const oveflowPadding = 12
        const showPadding = nowGenerating && buffer !== ''

        if (viewRef.current) {
            viewRef.current.measure((x, y, width, measuredHeight) => {
                const newHeight = measuredHeight + (showPadding ? oveflowPadding : 0)
                if (targetHeight.current === newHeight) return
                handleAnimateHeight(newHeight)
                targetHeight.current = newHeight
            })
        }
    }

    useEffect(() => {
        if (firstRender.current) {
            firstRender.current = false
            return
        }
        requestAnimationFrame(() => updateHeight())
    }, [buffer, mes, nowGenerating])

    return (
        <Animated.View style={{ overflow: 'scroll', height: animHeight }}>
            <View style={{ minHeight: 10 }} ref={viewRef}>
                {swipeId === currentSwipeId && nowGenerating && buffer === '' && (
                    <AnimatedEllipsis />
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
