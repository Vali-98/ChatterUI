import { useEffect, useRef } from 'react'
import { ScrollView, StyleSheet, KeyboardAvoidingView, Text } from 'react-native'
import { useMMKVBoolean, useMMKVListener } from 'react-native-mmkv'

import { ChatItem } from './ChatItem'
import { Color, Global } from '@globals'

const ChatWindow = ({ messages }) => {
    const [nowGenerating, setNowGenerating] = useMMKVBoolean(Global.NowGenerating)
    // this solution will have to change once editing is enabled as updating the content will scroll
    const scrollViewRef = useRef(null)
    useMMKVListener((key) => {
        if (key === Global.CurrentCharacter || key === Global.CurrentChat)
            scrollViewRef.current?.scrollToEnd()
    })
    useEffect(() => {
        if (!nowGenerating) scrollViewRef.current?.scrollToEnd()
    }, [nowGenerating])

    return (
        <KeyboardAvoidingView style={styles.chatHistory}>
            <ScrollView
                ref={scrollViewRef}
                onContentSizeChange={() => {
                    if (nowGenerating) scrollViewRef.current?.scrollToEnd()
                }}
                style={{ flex: 1, padding: 4 }}>
                {messages
                    ?.slice(1)
                    ?.map((message, index) => (
                        <ChatItem key={index} id={index} message={message} scroll={scrollViewRef} />
                    )) ?? (
                    <Text style={styles.errorMessage}>Something Has Gone Terribly Wrong</Text>
                )}
            </ScrollView>
        </KeyboardAvoidingView>
    )
}

export { ChatWindow }

const styles = StyleSheet.create({
    chatHistory: {
        flex: 1,
    },
    errorMessage: {
        margin: 16,
        alignSelf: 'center',
        flex: 1,
        color: Color.Text,
        fontSize: 20,
    },
})
