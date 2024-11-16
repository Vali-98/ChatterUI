import { useInference } from '@constants/Chat'
import { Chats, Style, MarkdownStyle } from '@globals'
import React, { useEffect, useRef } from 'react'
import { Easing, LayoutChangeEvent, Animated, View, StyleSheet, Platform } from 'react-native'
import Markdown from 'react-native-markdown-display'
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
    }, [nowGenerating])

    return (
        <Animated.View
            style={{
                height: animatedHeight,
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
                markdownit={MarkdownStyle.Rules}
                rules={{
                    ...MarkdownStyle.RenderRules,
                    body: (node: any, children: any, parent: any, styles: any) => (
                        <View
                            key={node.key}
                            style={styles._VIEW_SAFE_body}
                            onLayout={handleContentSizeChange}>
                            {children}
                        </View>
                    ),
                }}
                style={MarkdownStyle.Styles}>
                {nowGenerating && swipeId === currentSwipeId ? buffer.trim() : mes.trim()}
            </Markdown>
        </Animated.View>
    )
}

export default ChatTextLast
