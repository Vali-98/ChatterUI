import { useInference } from '@constants/Chat'
import { Chats, Style, MarkdownStyle } from '@globals'
import React, { useEffect, useRef } from 'react'
import { StyleSheet, Animated, Easing, LayoutChangeEvent } from 'react-native'
//@ts-expect-error
import Markdown from 'react-native-markdown-package'
//@ts-expect-error
import AnimatedEllipsis from 'rn-animated-ellipsis'
import { useShallow } from 'zustand/react/shallow'

type ChatTextProps = {
    nowGenerating: boolean
    id: number
}

const ChatTextLast: React.FC<ChatTextProps> = ({ nowGenerating, id }) => {
    const animatedHeight = useRef(new Animated.Value(-1)).current
    const height = useRef(-1)

    const { mes, swipeId } = Chats.useChat(
        useShallow((state) => ({
            mes:
                state?.data?.messages?.[id]?.swipes?.[state?.data?.messages?.[id].swipe_id ?? -1]
                    .swipe ?? '',

            swipeId:
                state?.data?.messages?.[id]?.swipes?.[state?.data?.messages?.[id].swipe_id ?? -1]
                    .id ?? -1,
        }))
    )

    const currentSwipeId = useInference((state) => state.currentSwipeId)

    const { buffer } = Chats.useChat(
        useShallow((state) => ({
            buffer: state.buffer,
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
        } else if (nowGenerating && mes) {
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
            {swipeId === currentSwipeId && nowGenerating && buffer === '' && (
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
                {nowGenerating && swipeId === currentSwipeId ? buffer.trim() : mes.trim()}
            </Markdown>
        </Animated.View>
    )
}

export default ChatTextLast

const styles = StyleSheet.create({
    messageText: {
        borderWidth: 2,
        borderColor: 'red',
    },
})
