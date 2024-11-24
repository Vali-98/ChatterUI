import { Chats, MarkdownStyle } from '@globals'
import React, { useEffect, useRef } from 'react'
import { View, Animated, Easing, useAnimatedValue } from 'react-native'
import Markdown from 'react-native-markdown-display'

type ChatTextProps = {
    nowGenerating: boolean
    id: number
}

const ChatText: React.FC<ChatTextProps> = ({ nowGenerating, id }) => {
    const mes = Chats.useChat(
        (state) =>
            state?.data?.messages?.[id]?.swipes?.[state?.data?.messages?.[id].swipe_id ?? -1]
                .swipe ?? ''
    )
    const viewRef = useRef<View>(null)

    const animHeight = useAnimatedValue(-1)
    const targetHeight = useRef(-1)

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
        if (viewRef.current) {
            viewRef.current.measure((x, y, width, measuredHeight) => {
                if (targetHeight.current === measuredHeight) return
                handleAnimateHeight(measuredHeight)
                targetHeight.current = measuredHeight
            })
        }
    }

    useEffect(() => {
        requestAnimationFrame(() => updateHeight())
    }, [mes])

    return (
        <Animated.View style={{ overflow: 'scroll', height: animHeight }}>
            <View style={{ minHeight: 10 }} ref={viewRef}>
                <Markdown
                    markdownit={MarkdownStyle.Rules}
                    rules={MarkdownStyle.RenderRules}
                    style={MarkdownStyle.Styles}>
                    {mes.trim()}
                </Markdown>
            </View>
        </Animated.View>
    )
}

export default ChatText
