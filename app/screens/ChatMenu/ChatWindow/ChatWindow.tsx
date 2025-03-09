import { AppSettings } from '@lib/constants/GlobalValues'
import { useAppMode } from '@lib/state/AppMode'
import { useBackgroundImage } from '@lib/state/BackgroundImage'
import { Chats } from '@lib/state/Chat'
import { AppDirectory } from '@lib/utils/File'
import { ImageBackground } from 'expo-image'
import { FlatList } from 'react-native'
import { useMMKVBoolean } from 'react-native-mmkv'

import ChatItem from './ChatItem'
import ChatModelName from './ChatModelName'
import EditorModal from './EditorModal'

type ListItem = {
    index: number
    key: string
    isLastMessage: boolean
    isGreeting: boolean
}

const ChatWindow = () => {
    const { chat } = Chats.useChat()
    const { appMode } = useAppMode()
    const [showModelname, __] = useMMKVBoolean(AppSettings.ShowModelInChat)
    const [autoScroll, ___] = useMMKVBoolean(AppSettings.AutoScroll)

    const image = useBackgroundImage((state) => state.image)

    const list: ListItem[] = (chat?.messages ?? [])
        .map((item, index) => ({
            index: index,
            key: item.id.toString(),
            isGreeting: index === 0,
            isLastMessage: !!chat?.messages && index === chat?.messages.length - 1,
        }))
        .reverse()

    const renderItems = ({ item, index }: { item: ListItem; index: number }) => {
        return (
            <ChatItem
                index={item.index}
                isLastMessage={item.isLastMessage}
                isGreeting={item.isGreeting}
            />
        )
    }

    return (
        <ImageBackground
            cachePolicy="none"
            style={{ flex: 1 }}
            source={{ uri: image ? AppDirectory.Assets + image : '' }}>
            <EditorModal />
            {showModelname && appMode === 'local' && <ChatModelName />}
            <FlatList
                maintainVisibleContentPosition={
                    autoScroll ? null : { minIndexForVisible: 1, autoscrollToTopThreshold: 50 }
                }
                keyboardShouldPersistTaps="handled"
                inverted
                data={list}
                keyExtractor={(item) => item.key}
                renderItem={renderItems}
            />
        </ImageBackground>
    )
}

export default ChatWindow
