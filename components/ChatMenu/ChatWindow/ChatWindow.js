import { useEffect, useRef } from 'react'
import { ScrollView, StyleSheet, KeyboardAvoidingView, Text, VirtualizedList } from 'react-native'
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

    const getitemcount = () => {
        return messages.length ? messages?.length - 1 : 0
    }
    const getitems = (_data, index) => {
        return {
            index: index,
            message: messages.at(index + 1),
            key: messages.at(index + 1).send_date,
        }
    }

    return (
        <KeyboardAvoidingView style={styles.chatHistory}>
            <VirtualizedList
                showsVerticalScrollIndicator={false}
                getItemCount={getitemcount}
                onScrollToIndexFailed={() => {}}
                onContentSizeChange={() => scrollViewRef?.current?.scrollToEnd()}
                ref={scrollViewRef}
                initialNumToRender={0}
                initialScrollIndex={getitemcount() - 1 > -1 ? getitemcount() - 1 : 0}
                style={{ flex: 1, padding: 4 }}
                getItem={getitems}
                keyExtractor={(item) => item.key}
                windowSize={2}
                renderItem={(item) => (
                    <ChatItem index={item.index} id={item.index} message={item.message} />
                )}></VirtualizedList>
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
