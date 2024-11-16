import { Chats, MarkdownStyle } from '@globals'
import React, { useEffect, useRef } from 'react'
import { Animated, Easing, LayoutChangeEvent } from 'react-native'
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
        const newHeight = event.nativeEvent.layout.height
        const oveflowPadding = 12

        if (height.current === -1) {
            height.current = newHeight
            animatedHeight.setValue(newHeight)
            return
        }

        if (height.current === newHeight) return
        height.current = newHeight
        handleAnimateHeight(newHeight)
    }
    useEffect(() => {
        if (!nowGenerating && height.current !== -1) {
            handleAnimateHeight(height.current)
        } else if (nowGenerating && !mes) {
            // NOTE: this assumes that mes is empty due to a swipe and may break, but unlikely
            height.current = 0
            handleAnimateHeight(height.current)
        }
    }, [nowGenerating])

    return (
        <Animated.View
            onLayout={handleContentSizeChange}
            style={{
                height: __DEV__ ? 'auto' : animatedHeight, // dev fix for slow emulator animations
                overflow: 'scroll',
            }}>
            <Markdown
                markdownit={MarkdownStyle.Rules}
                rules={MarkdownStyle.RenderRules}
                style={MarkdownStyle.Styles}>
                {mes.trim()}
            </Markdown>
        </Animated.View>
    )
}

export default ChatText
