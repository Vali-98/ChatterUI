import { StyleSheet, Animated, Easing, LayoutChangeEvent } from 'react-native'
import React, { useEffect, useRef } from 'react'
//@ts-expect-error
import AnimatedEllipsis from 'rn-animated-ellipsis'
//@ts-expect-error
import Markdown from 'react-native-markdown-package'
import { Chats, Style, MarkdownStyle } from '@globals'
import { useShallow } from 'zustand/react/shallow'

type ChatTextProps = {
    showEllipsis: boolean
    nowGenerating: boolean
    id: number
    isLastMessage: boolean
}

const ChatText: React.FC<ChatTextProps> = ({ showEllipsis, nowGenerating, id, isLastMessage }) => {
    const animatedHeight = useRef(new Animated.Value(-1)).current
    const height = useRef(-1)

    const mes = Chats.useChat(
        (state) =>
            state?.data?.messages?.[id]?.swipes?.[state?.data?.messages?.[id].swipe_id ?? -1]
                .swipe ?? ''
    )

    const { buffer } = Chats.useChat(
        useShallow((state) => ({
            buffer: isLastMessage ? state.buffer : '',
        }))
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
        if (height.current === newHeight) return
        height.current = newHeight
        const showPadding = nowGenerating && buffer !== ''
        handleAnimateHeight(newHeight + (showPadding ? oveflowPadding : 0))
    }

    useEffect(() => {
        if (!nowGenerating) {
            handleAnimateHeight(height.current)
        } else if (nowGenerating && !mes) {
            // NOTE: this assumes that mes is empty due to a swipe and may break, but unlikely
            height.current = -1
            handleAnimateHeight(height.current)
        }
    }, [nowGenerating])

    return (
        <Animated.View
            style={{
                height: animatedHeight,
                overflow: 'scroll',
            }}>
            {showEllipsis && buffer === '' && (
                <AnimatedEllipsis
                    style={{
                        color: Style.getColor('primary-text2'),
                        fontSize: 20,
                    }}
                />
            )}

            <Markdown
                onLayout={handleContentSizeChange}
                style={styles.messageText}
                rules={{ rules: MarkdownStyle.Rules }}
                styles={MarkdownStyle.Format}>
                {nowGenerating && isLastMessage ? buffer.trim() : mes.trim()}
            </Markdown>
        </Animated.View>
    )
}

export default ChatText

const styles = StyleSheet.create({
    messageText: {
        borderWidth: 2,
        borderColor: 'red',
    },
})
