import { StyleSheet, KeyboardAvoidingView, FlatList } from 'react-native'
import { ChatItem } from './ChatItem'
import { Chats, Color, Global } from '@globals'
import { useMMKVBoolean, useMMKVString } from 'react-native-mmkv'
import { useEffect, useRef } from 'react'

type ListItem = {
    index: number
    key: number
}

const ChatWindow = () => {
    // this solution will have to change once editing is enabled as updating the content will scroll
    const { nowGenerating } = Chats.useChat((state) => ({
        nowGenerating: state.nowGenerating,
    }))
    const [charName, setCharName] = useMMKVString(Global.CurrentCharacter)
    const [userName, setUserName] = useMMKVString(Global.CurrentUser)
    const flatListRef = useRef<FlatList>(null)
    const messages = Chats.useChat((state) => state?.data) ?? ''
    const messagesLength = messages?.length ?? 0
    const [TTSenabled, setTTSenabled] = useMMKVBoolean(Global.TTSEnable)

    useEffect(() => {
        if (nowGenerating) flatListRef?.current?.scrollToOffset({ animated: true, offset: 0 })
    }, [nowGenerating])
    const getItems = (): Array<ListItem> => {
        const arr: Array<ListItem> = []
        for (let i = 0; i < messagesLength; i++) {
            arr.push({ index: i, key: i })
        }

        return arr.reverse()
    }

    const renderItems = ({ item, index }: { item: ListItem; index: number }) => {
        return (
            <ChatItem
                id={item.index}
                nowGenerating={nowGenerating ?? false}
                charName={charName ?? ''}
                userName={userName ?? ''}
                TTSenabled={TTSenabled ?? false}
            />
        )
    }

    return (
        <KeyboardAvoidingView style={styles.chatHistory}>
            <FlatList
                ref={flatListRef}
                inverted
                windowSize={3}
                data={getItems()}
                keyExtractor={(item) => item.key.toString()}
                renderItem={renderItems}
            />
        </KeyboardAvoidingView>
    )
}

export { ChatWindow }

const styles = StyleSheet.create({
    chatHistory: {
        flex: 1,
    },
})
