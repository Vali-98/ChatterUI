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
    const [nowGenerating, setNowGenerating] = useMMKVBoolean(Global.NowGenerating)
    const [charName, setCharName] = useMMKVString(Global.CurrentCharacter)
    const [userName, setUserName] = useMMKVString(Global.CurrentUser)
    const flatListRef = useRef<FlatList>(null)
    const messages = Chats.useChat((state) => state?.data) ?? ''
    const messagesLength = messages?.length ?? 0

    useEffect(() => {
        if (nowGenerating) flatListRef?.current?.scrollToOffset({ animated: true, offset: 0 })
    }, [nowGenerating])
    const getItems = (): Array<ListItem> => {
        return Array<ListItem>(messagesLength)
            .fill({ index: 1, key: 1 })
            .map(
                (item, index): ListItem => ({
                    index: index,
                    key: index,
                })
            )
            .reverse()
    }

    const renderItems = ({ item, index }: { item: ListItem; index: number }) => {
        //if (index === 0) return <ChatItem id={item.index} />
        return (
            <ChatItem
                id={item.index}
                nowGenerating={nowGenerating ?? false}
                setNowGenerating={setNowGenerating ?? ((b: boolean) => {})}
                charName={charName ?? ''}
                userName={userName ?? ''}
            />
        )
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
                    keyExtractor={(item) => item.key.toString()}
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
