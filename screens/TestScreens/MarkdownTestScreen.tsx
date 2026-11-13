/* eslint-disable i18next/no-literal-string */
import { useFocusEffect } from 'expo-router'
import React, { useCallback, useEffect, useRef, useState } from 'react'
import { ScrollView, View } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'

import ThemedMarkdown from '@components/text/markdown/ThemedMarkdown'
import ThemedButton from '@components/buttons/ThemedButton'
import ThemedSlider from '@components/input/ThemedSlider'
import TText from '@components/text/TText'
import Accordion from '@components/views/Accordion'
import HeaderTitle from '@components/views/HeaderTitle'
import { markdownTestText } from '@lib/markdown/testText'

// Approximate streamed tokens without including tokenization work in the rendering benchmark.
const streamTokens = markdownTestText.match(/[\s\S]{1,4}/g) ?? []

const MarkdownPreview = ({
    isStreaming,
    tokensPerSecond,
    onFinish,
}: {
    isStreaming: boolean
    tokensPerSecond: number
    onFinish: () => void
}) => {
    const [text, setText] = useState(isStreaming ? '' : markdownTestText)
    const cursor = useRef(0)
    useEffect(() => {
        if (!isStreaming) {
            setText(markdownTestText)
            return
        }
        const timer = setInterval(() => {
            const token = streamTokens[cursor.current]
            cursor.current++
            setText((previous) => previous + token)
            if (cursor.current === streamTokens.length) {
                clearInterval(timer)
                onFinish()
            }
        }, 1000 / tokensPerSecond)
        return () => clearInterval(timer)
    }, [isStreaming, tokensPerSecond, onFinish])

    return <ThemedMarkdown streaming={isStreaming}>{text}</ThemedMarkdown>
}

const MarkdownTestScreen = () => {
    const [isStreaming, setIsStreaming] = useState(false)
    const [tokensPerSecond, setTokensPerSecond] = useState(50)
    const [streamId, setStreamId] = useState(0)
    const scrollRef = useRef<ScrollView>(null)
    const stopStream = useCallback(() => setIsStreaming(false), [])

    useFocusEffect(useCallback(() => () => setIsStreaming(false), []))

    const toggleStream = () => {
        if (isStreaming) {
            setIsStreaming(false)
            return
        }
        setStreamId((previous) => previous + 1)
        setIsStreaming(true)
    }

    return (
        <SafeAreaView style={{ flex: 1 }} edges={['bottom']}>
            <HeaderTitle title="Markdown Test" />
            <View style={{ flex: 1 }}>
                <ScrollView
                    ref={scrollRef}
                    onContentSizeChange={() => {
                        if (streamId > 0) scrollRef.current?.scrollToEnd({ animated: false })
                    }}
                    showsVerticalScrollIndicator={false}
                    contentContainerStyle={{
                        padding: 16,
                        paddingBottom: 96,
                        flexGrow: 1,
                    }}
                    style={{ flex: 1 }}>
                    <Accordion label="Simulated token stream" style={{ marginBottom: 16 }}>
                        <View style={{ rowGap: 12 }}>
                            <TText>
                                Streams the sample once, using 4-character chunks as tokens.
                            </TText>
                            <ThemedSlider
                                label="Tokens per second"
                                value={tokensPerSecond}
                                onValueChange={setTokensPerSecond}
                                min={1}
                                max={500}
                                step={1}
                            />
                            {!isStreaming && (
                                <ThemedButton
                                    label="Start stream"
                                    level="primary"
                                    onPress={toggleStream}
                                />
                            )}
                        </View>
                    </Accordion>
                    <View style={{ flex: 1 }}>
                        <MarkdownPreview
                            key={streamId}
                            isStreaming={isStreaming}
                            tokensPerSecond={tokensPerSecond}
                            onFinish={stopStream}
                        />
                    </View>
                </ScrollView>
                {isStreaming && (
                    <ThemedButton
                        label="Stop stream"
                        variant="primary"
                        level="error"
                        onPress={toggleStream}
                        viewStyle={{ position: 'absolute', bottom: 16, right: 16, elevation: 6 }}
                    />
                )}
            </View>
        </SafeAreaView>
    )
}

export default MarkdownTestScreen
