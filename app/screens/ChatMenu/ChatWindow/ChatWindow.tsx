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
import { useDebounce } from '@lib/hooks/Debounce'
import { useEffect, useRef, useState } from 'react'

type ListItem = {
    index: number
    key: string
    isLastMessage: boolean
    isGreeting: boolean
}

const ChatWindow = () => {
    const { chat } = Chats.useChat()
    const { appMode } = useAppMode()
    const [saveScroll, _] = useMMKVBoolean(AppSettings.SaveScrollPosition)
    const [showModelname, __] = useMMKVBoolean(AppSettings.ShowModelInChat)
    const [autoScroll, ___] = useMMKVBoolean(AppSettings.AutoScroll)

    const flatlistRef = useRef<FlatList | null>(null)

    const updateScrollPosition = useDebounce((position: number, chatId: number) => {
        if (chatId) {
            Chats.db.mutate.updateScrollOffset(chatId, position)
        }
    }, 200)

    useEffect(() => {
        if (saveScroll && chat?.scroll_offset) {
            const offset = Math.max(0, chat.scroll_offset)
            if (offset > 2)
                flatlistRef.current?.scrollToIndex({
                    index: offset,
                    animated: false,
                    viewOffset: 100,
                })
        }
    }, [chat?.id, chat?.scroll_offset])

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
                ref={flatlistRef}
                maintainVisibleContentPosition={
                    autoScroll ? null : { minIndexForVisible: 1, autoscrollToTopThreshold: 50 }
                }
                keyboardShouldPersistTaps="handled"
                inverted
                data={list}
                keyExtractor={(item) => item.key}
                renderItem={renderItems}
                scrollEventThrottle={16}
                onViewableItemsChanged={(item) => {
                    const index = item.viewableItems?.at(0)?.index
                    if (index && chat?.id) updateScrollPosition(index, chat.id)
                }}
                onScrollToIndexFailed={(error) => {
                    flatlistRef.current?.scrollToOffset({
                        offset: error.averageItemLength * error.index,
                        animated: true,
                    })
                    setTimeout(() => {
                        if (list.length !== 0 && flatlistRef.current !== null) {
                            flatlistRef.current?.scrollToIndex({
                                index: error.index,
                                animated: true,
                            })
                        }
                    }, 100)
                }}
            />
        </ImageBackground>
    )
}

export default ChatWindow
