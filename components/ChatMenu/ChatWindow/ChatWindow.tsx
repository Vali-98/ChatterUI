import { StyleSheet, FlatList } from 'react-native'
import { ChatItem } from './ChatItem'
import { Characters, Chats, Global } from '@globals'
import { useMMKVBoolean, useMMKVString } from 'react-native-mmkv'
import { useEffect, useRef } from 'react'
import { useShallow } from 'zustand/react/shallow'

type ListItem = {
    index: number
    key: number
}

const ChatWindow = () => {
    const { nowGenerating } = Chats.useChat(
        useShallow((state) => ({
            nowGenerating: state.nowGenerating,
        }))
    )
    const charId = Characters.useCharacterCard(useShallow((state) => state?.id))

    const [userName, setUserName] = useMMKVString(Global.CurrentUser)
    const flatListRef = useRef<FlatList>(null)
    const messagesLength = Chats.useChat((state) => state?.data?.messages?.length) ?? -1
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
                messagesLength={messagesLength}
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
            windowSize={2}
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
