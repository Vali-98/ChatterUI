import { AppSettings } from '@lib/constants/GlobalValues'
import { useAppMode } from '@lib/state/AppMode'
import { useBackgroundImage } from '@lib/state/BackgroundImage'
import { Chats } from '@lib/state/Chat'
import { AppDirectory } from '@lib/utils/File'
import { ImageBackground } from 'expo-image'
import { LegendList, LegendListRef } from '@legendapp/list'
import { useMMKVBoolean } from 'react-native-mmkv'

import ChatItem from './ChatItem'
import ChatModelName from './ChatModelName'
import EditorModal from './EditorModal'
import { useEffect, useRef, useState } from 'react'
import ThemedButton from '@components/buttons/ThemedButton'
import Animated, { FadeInDown, FadeOutDown } from 'react-native-reanimated'

const ChatWindow = () => {
    const { chat, chatLength } = Chats.useChat()
    const { appMode } = useAppMode()
    const [showModelname, __] = useMMKVBoolean(AppSettings.ShowModelInChat)
    const [autoScroll, ___] = useMMKVBoolean(AppSettings.AutoScroll)
    const [currentIndex, setCurrentIndex] = useState(0)
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

    const listRef = useRef<LegendListRef>(null)

    useEffect(() => {
        setCurrentIndex(chatLength ?? 0)
        listRef.current?.scrollToEnd({ animated: false })
    }, [chat.id])
    return (
        <ImageBackground
            cachePolicy="none"
            style={{ flex: 1 }}
            source={{ uri: image ? AppDirectory.Assets + image : '' }}>
            <EditorModal />
            {showModelname && appMode === 'local' && <ChatModelName />}
            <LegendList
                ref={listRef}
                maintainVisibleContentPosition={!autoScroll}
                keyboardShouldPersistTaps="handled"
                initialContainerPoolRatio={2}
                waitForInitialLayout
                alignItemsAtEnd
                maintainScrollAtEnd
                maintainScrollAtEndThreshold={0.1}
                estimatedItemSize={320}
                initialScrollIndex={chat.messages.length}
                data={chat.messages}
                keyExtractor={(item) => item.id.toString()}
                renderItem={({ index }) => (
                    <ChatItem
                        index={index}
                        isLastMessage={index === chat.messages.length - 1}
                        isGreeting={index === 0}
                    />
                )}
                extraData={[chat.id, chatLength, chat.messages]}
                onViewableItemsChanged={({ viewableItems }) => {
                    if (viewableItems.length > 0) {
                        const currentIndex = viewableItems[0].index
                        setCurrentIndex(currentIndex)
                    }
                }}
            />
            {chatLength && chatLength - currentIndex > 25 && (
                <Animated.View entering={FadeInDown.delay(2000)}>
                    <ThemedButton
                        label="Jump To Bottom"
                        buttonStyle={{
                            position: 'absolute',
                            bottom: 10,
                            left: 20,
                        }}
                        onPress={() => {
                            listRef.current?.scrollToEnd({ animated: false })
                            setCurrentIndex(chatLength)
                        }}
                    />
                </Animated.View>
            )}
        </ImageBackground>
    )
}

export default ChatWindow
