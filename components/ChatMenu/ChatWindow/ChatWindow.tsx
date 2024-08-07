import { AppSettings, Characters, Chats, Global } from '@globals'
import { StyleSheet, FlatList } from 'react-native'
import { useMMKVBoolean } from 'react-native-mmkv'
import { useShallow } from 'zustand/react/shallow'

import { ChatItem } from './ChatItem'

type ListItem = {
    index: number
    key: string
}

const ChatWindow = () => {
    const charId = Characters.useCharacterCard(useShallow((state) => state?.id))
    const messagesLength = Chats.useChat(useShallow((state) => state?.data?.messages?.length)) ?? -1
    const messages = Chats.useChat((state) => state.data?.messages)
    const [autoScroll, setAutoScroll] = useMMKVBoolean(AppSettings.AutoScroll)

    const getItems = (): ListItem[] => {
        const list: ListItem[] = []
        messages?.map((item, index) => list.push({ index: index, key: item.id.toString() }))
        return list.reverse() ?? []
    }

    const renderItems = ({ item, index }: { item: ListItem; index: number }) => {
        return <ChatItem messagesLength={messagesLength} id={item.index} charId={charId ?? -1} />
    }

    return (
        <FlatList
            style={styles.chatHistory}
            maintainVisibleContentPosition={
                autoScroll ? null : { minIndexForVisible: 1, autoscrollToTopThreshold: 50 }
            }
            keyboardShouldPersistTaps="handled"
            removeClippedSubviews={false}
            inverted
            windowSize={2}
            data={getItems()}
            keyExtractor={(item) => item.key}
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
