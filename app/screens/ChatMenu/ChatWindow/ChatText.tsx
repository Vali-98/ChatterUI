import ThemedButton from '@components/buttons/ThemedButton'
import { useTextFilter } from '@lib/hooks/TextFilter'
import { MarkdownStyle } from '@lib/markdown/Markdown'
import { Chats } from '@lib/state/Chat'
import React, { useEffect, useRef, useState } from 'react'
import { View, Animated, Easing, useAnimatedValue } from 'react-native'
import Markdown from 'react-native-markdown-display'

type ChatTextProps = {
    nowGenerating: boolean
    index: number
}

const ChatText: React.FC<ChatTextProps> = ({ nowGenerating, index }) => {
    const markdownStyle = MarkdownStyle.useMarkdownStyle()
    const [showHidden, setShowHidden] = useState(false)
    const { swipeText } = Chats.useSwipeData(index)
    const viewRef = useRef<View>(null)
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
        if (firstRender.current) return
        if (viewRef.current) {
            viewRef.current.measure((x, y, width, measuredHeight) => {
                if (targetHeight.current === measuredHeight) return
                if (targetHeight.current > -1) animHeight.setValue(targetHeight.current)
                handleAnimateHeight(measuredHeight)
                targetHeight.current = measuredHeight
            })
        }
    }

    useEffect(() => {
        if (firstRender.current) {
            return () => {
                firstRender.current = false
            }
        }
        // requestAnimationFrame(() => updateHeight())
    }, [swipeText])

    const filteredText = useTextFilter(swipeText?.trim() ?? '')
    const renderedText = showHidden ? swipeText?.trim() : filteredText.result
    return (
        <Animated.View style={{ overflow: 'scroll', height: animHeight }}>
            <View style={{ minHeight: 10 }} ref={viewRef} onLayout={() => updateHeight()}>
                <Markdown
                    mergeStyle={false}
                    markdownit={MarkdownStyle.Rules}
                    rules={MarkdownStyle.RenderRules}
                    style={markdownStyle}>
                    {renderedText}
                </Markdown>
                {filteredText.found && (
                    <View style={{ flexDirection: 'row', justifyContent: 'flex-end' }}>
                        <ThemedButton
                            onPress={() => setShowHidden(!showHidden)}
                            variant="secondary"
                            label={showHidden ? 'Hide Filtered' : 'Show Filtered'}
                            labelStyle={{ flex: 0, fontSize: 12 }}
                            buttonStyle={{
                                paddingVertical: 0,
                                paddingHorizontal: 4,
                                borderWidth: 0,
                            }}
                        />
                    </View>
                )}
            </View>
        </Animated.View>
    )
}

export default ChatText
