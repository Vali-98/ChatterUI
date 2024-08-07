import { StyleSheet, FlatList } from 'react-native'
import { ChatItem } from './ChatItem'
import { Characters, Chats, Global } from '@globals'
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

    const charId = Characters.useCharacterCard((state) => state?.id)

    const [userName, setUserName] = useMMKVString(Global.CurrentUser)
    const flatListRef = useRef<FlatList>(null)
    const messages = Chats.useChat((state) => state?.data?.messages) ?? ''
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
                charId={charId ?? -1}
                userName={userName ?? ''}
                TTSenabled={TTSenabled ?? false}
            />
        )
    }

    return (
        <FlatList
            style={styles.chatHistory}
            ref={flatListRef}
            keyboardShouldPersistTaps={'handled'}
            removeClippedSubviews={false}
            inverted
            windowSize={3}
            data={getItems()}
            keyExtractor={(item) => item.key.toString()}
            renderItem={renderItems}
        />
    )
}

export { ChatWindow }

const styles = StyleSheet.create({
    chatHistory: {
        flex: 1,
    },
})
