import { StyleSheet, KeyboardAvoidingView, FlatList, ScrollView } from 'react-native'
import { ChatItem } from './ChatItem'
import { Color, Global } from '@globals'
import { useMMKVBoolean } from 'react-native-mmkv'
import { useEffect, useRef } from 'react'
import { ChatItemLast } from './ChatItemLast'
const ChatWindow = ({ messages }) => {
    // this solution will have to change once editing is enabled as updating the content will scroll
    const [nowGenerating, setNowGenerating] = useMMKVBoolean(Global.NowGenerating)
    const flatListRef = useRef(null)

    useEffect(() => {
        if (nowGenerating) flatListRef?.current?.scrollToOffset({ animated: true, offset: 0 })
    }, [nowGenerating])

    const getItems = () => {
        return messages
            .slice(1)
            .map((message, index) => ({
                index: index,
                message: message,
                key: index,
            }))
            .reverse()
    }

    const renderItems = ({ item, index }) => {
        if (index === 0) return <ChatItemLast id={item.index} message={item.message} />
        return <ChatItem id={item.index} message={item.message} />
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
