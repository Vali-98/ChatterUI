import { Chats, MarkdownStyle } from '@globals'
import React, { useEffect, useRef } from 'react'
import { Animated, Easing, LayoutChangeEvent } from 'react-native'
//@ts-expect-error
import Markdown from 'react-native-markdown-package'

type ChatTextProps = {
    nowGenerating: boolean
    id: number
}

const ChatText: React.FC<ChatTextProps> = ({ nowGenerating, id }) => {
    const animatedHeight = useRef(new Animated.Value(-1)).current
    const height = useRef(-1)

    const mes = Chats.useChat(
        (state) =>
            state?.data?.messages?.[id]?.swipes?.[state?.data?.messages?.[id].swipe_id ?? -1]
                .swipe ?? ''
    )

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
            style={{
                height: __DEV__ ? 'auto' : animatedHeight, // dev fix for slow emulator animations
                overflow: 'scroll',
            }}>
            <Markdown
                onLayout={handleContentSizeChange}
                rules={{ rules: MarkdownStyle.Rules }}
                styles={MarkdownStyle.Format}>
                {mes.trim()}
            </Markdown>
        </Animated.View>
    )
}

export default ChatText
