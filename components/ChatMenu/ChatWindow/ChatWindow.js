import { StyleSheet, KeyboardAvoidingView, FlatList, ScrollView } from 'react-native'
import { ChatItem } from './ChatItem'
import { Chats, Color, Global, Logger } from '@globals'
import { useMMKVBoolean } from 'react-native-mmkv'
import { useEffect, useRef } from 'react'
const ChatWindow = () => {
    // this solution will have to change once editing is enabled as updating the content will scroll
    const [nowGenerating, setNowGenerating] = useMMKVBoolean(Global.NowGenerating)
    const flatListRef = useRef(null)
    const messages = Chats.useChat((state) => state?.data) ?? ''
    const messagesLength = messages?.length ?? 0

    useEffect(() => {
        if (nowGenerating) flatListRef?.current?.scrollToOffset({ animated: true, offset: 0 })
    }, [nowGenerating])
    const getItems = () => {
        return Array(messagesLength)
            .fill('')
            .map((item, index) => ({
                index: index,
                key: index,
            }))
            .reverse()
    }

    const renderItems = ({ item, index }) => {
        //if (index === 0) return <ChatItem id={item.index} />
        return <ChatItem id={item.index} />
    }

    return (
        <KeyboardAvoidingView style={styles.chatHistory}>
            {/*messages.slice(1).map((item, index) => (
                    <ChatItem id={index} message={item} />
                ))*/}
            {
                <FlatList
                    ref={flatListRef}
                    inverted
                    windowSize={3}
                    data={getItems()}
                    keyExtractor={(item) => item.key}
                    renderItem={renderItems}
                />
            }
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
