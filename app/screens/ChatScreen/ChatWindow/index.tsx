import { useLiveQuery } from 'drizzle-orm/expo-sqlite'
import { ImageBackground } from 'expo-image'
import { useEffect, useRef } from 'react'
import { FlatList } from 'react-native'
import { useMMKVBoolean } from 'react-native-mmkv'
import Animated, { FadeIn, FadeOut, LinearTransition } from 'react-native-reanimated'
import { useShallow } from 'zustand/react/shallow'

import Drawer from '@components/views/Drawer'
import HeaderTitle from '@components/views/HeaderTitle'
import { AppSettings } from '@lib/constants/GlobalValues'
import { useDebounce } from '@lib/hooks/Debounce'
import { useAppMode } from '@lib/state/AppMode'
import { useBackgroundStore } from '@lib/state/BackgroundImage'
import { Characters } from '@lib/state/Characters'
import { Chats } from '@lib/state/Chat'
import { AppDirectory } from '@lib/utils/File'

import { useInputHeightStore } from '../ChatInput'
import ChatFooter from './ChatFooter'
import ChatHeaderGradient from './ChatHeaderGradient'
import ChatItem from './ChatItem'
import ChatModelName from './ChatModelName'

type ListItem = {
    index: number
    key: string
    isLastMessage: boolean
    isGreeting: boolean
}

const ChatWindow = () => {
    const { chat } = Chats.useChat()
    const charId = Characters.useCharacterStore((state) => state.card?.id)
    const { appMode } = useAppMode()
    const [saveScroll] = useMMKVBoolean(AppSettings.SaveScrollPosition)
    const [showModelname] = useMMKVBoolean(AppSettings.ShowModelInChat)
    const [autoScroll] = useMMKVBoolean(AppSettings.AutoScroll)
    const chatInputHeight = useInputHeightStore(useShallow((state) => state.height))
    const { data: { background_image: backgroundImage } = {} } = useLiveQuery(
        Characters.db.query.backgroundImageQuery(charId ?? -1)
    )
    const { cause: scrollCause, index: scrollIndex } = chat?.autoScroll ?? {}
    const flatlistRef = useRef<FlatList | null>(null)
    const { showSettings, showChat } = Drawer.useDrawerStore(
        useShallow((state) => ({
            showSettings: state.values?.[Drawer.ID.SETTINGS],
            showChat: state.values?.[Drawer.ID.CHATLIST],
        }))
    )

    const updateScrollPosition = useDebounce((position: number, chatId: number) => {
        if (chatId) {
            Chats.db.mutate.updateScrollOffset(chatId, position)
        }
    }, 200)

    const image = useBackgroundStore((state) => state.image)

    const list: ListItem[] = (chat?.messages ?? [])
        .map((item, index) => ({
            index: index,
            key: item.id.toString(),
            isGreeting: index === 0,
            isLastMessage: !!chat?.messages && index === chat?.messages.length - 1,
        }))
        .reverse()

    useEffect(() => {
        if (!scrollCause || !scrollIndex) return
        const isSave = scrollCause === 'saveScroll'
        if (!saveScroll && isSave) return
        const offset = Math.min(Math.max(0, scrollIndex + (isSave ? 1 : 0)), list.length - 1)

        if (offset > 2)
            flatlistRef.current?.scrollToIndex({
                index: offset,
                animated: scrollCause === 'search',
                viewOffset: 32,
            })
    }, [scrollCause, scrollIndex, list.length, saveScroll])

    const renderItems = ({ item }: { item: ListItem }) => {
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
            source={{
                uri: backgroundImage
                    ? Characters.getImageDir(backgroundImage)
                    : image
                      ? AppDirectory.Assets + image
                      : '',
            }}>
            {showModelname && appMode === 'local' && (
                <HeaderTitle headerTitle={() => !showSettings && !showChat && <ChatModelName />} />
            )}

            <FlatList
                CellRendererComponent={(props: any) => (
                    <Animated.View
                        {...props}
                        layout={LinearTransition.duration(250)
                            .springify()
                            .mass(0.3)
                            .damping(20)
                            .stiffness(300)}
                        exiting={FadeOut.duration(150)}
                        entering={FadeIn.duration(150).delay(100)}
                    />
                )}
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

                    if (index && chat?.id)
                        updateScrollPosition(
                            index - (item.viewableItems.length === 1 ? 1 : 0),
                            chat.id
                        )
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
                                viewOffset: 32,
                            })
                        }
                    }, 100)
                }}
                contentContainerStyle={{
                    paddingTop: chatInputHeight,
                    paddingBottom: 32,
                    rowGap: 8,
                }}
                ListFooterComponent={() => <ChatFooter />}
            />

            <ChatHeaderGradient />
        </ImageBackground>
    )
}

export default ChatWindow
