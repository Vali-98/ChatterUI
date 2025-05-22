import { AppSettings } from '@lib/constants/GlobalValues'
import { useAppMode } from '@lib/state/AppMode'
import { useBackgroundImage } from '@lib/state/BackgroundImage'
import { Chats } from '@lib/state/Chat'
import { AppDirectory } from '@lib/utils/File'
import { ImageBackground } from 'expo-image'
import { LegendList } from '@legendapp/list'
import { useMMKVBoolean } from 'react-native-mmkv'

import ChatItem from './ChatItem'
import ChatModelName from './ChatModelName'
import EditorModal from './EditorModal'

const ChatWindow = () => {
    const { chat } = Chats.useChat()
    const { appMode } = useAppMode()
    const [showModelname, __] = useMMKVBoolean(AppSettings.ShowModelInChat)
    const [autoScroll, ___] = useMMKVBoolean(AppSettings.AutoScroll)

    const image = useBackgroundImage((state) => state.image)

    if (!chat)
        return (
            <ImageBackground
                cachePolicy="none"
                style={{ flex: 1 }}
                source={{ uri: image ? AppDirectory.Assets + image : '' }}>
                {showModelname && appMode === 'local' && <ChatModelName />}
            </ImageBackground>
        )

    return (
        <ImageBackground
            cachePolicy="none"
            style={{ flex: 1 }}
            source={{ uri: image ? AppDirectory.Assets + image : '' }}>
            <EditorModal />
            {showModelname && appMode === 'local' && <ChatModelName />}
            <LegendList
                maintainVisibleContentPosition={true}
                keyboardShouldPersistTaps="handled"
                alignItemsAtEnd
                maintainScrollAtEnd
                estimatedItemSize={400}
                initialScrollIndex={chat.messages.length}
                data={chat.messages}
                keyExtractor={(item) => item.id.toString()}
                renderItem={({ item, index }) => (
                    <ChatItem
                        index={index}
                        isLastMessage={index === chat.messages.length - 1}
                        isGreeting={index === 0}
                    />
                )}
                extraData={[chat.messages.length]}
            />
        </ImageBackground>
    )
}

export default ChatWindow
