import { ImageBackground } from 'expo-image'
import { useEffect, useRef, useState } from 'react'
import { FlatList } from 'react-native'
import { useMMKVBoolean } from 'react-native-mmkv'
import { useShallow } from 'zustand/react/shallow'

import Drawer from '@components/views/Drawer'
import HeaderTitle from '@components/views/HeaderTitle'
import { AppSettings } from '@lib/constants/GlobalValues'
import { useDebounce } from '@lib/hooks/Debounce'
import { useLiveQueryJoined } from '@lib/hooks/LiveQueryJoined'
import { useAppMode } from '@lib/state/AppMode'
import { useBackgroundStore } from '@lib/state/BackgroundImage'
import { Characters } from '@lib/state/Characters'
import { Chats, ScrollData } from '@lib/state/Chat'
import { AppDirectory } from '@lib/utils/File'

import ChatFooter from './ChatFooter'
import ChatHeader from './ChatHeader'
import ChatHeaderGradient from './ChatHeaderGradient'
import ChatItem from './ChatItem'
import ChatJumpButton from './ChatJumpButton'
import ChatModelName from './ChatModelName'

type ChatWindowProps = {
    chatId: number
    scrollData?: ScrollData
}

const ChatWindow: React.FC<ChatWindowProps> = ({ chatId, scrollData }) => {
    const charId = Characters.useCharacterStore((state) => state.card?.id)

    const { appMode } = useAppMode()
    const [saveScroll] = useMMKVBoolean(AppSettings.SaveScrollPosition)
    const [showModelname] = useMMKVBoolean(AppSettings.ShowModelInChat)
    const [showJump, setShowJump] = useState(false)
    const [autoScroll] = useMMKVBoolean(AppSettings.AutoScroll)
    const { data: { background_image: backgroundImage } = {} } = useLiveQueryJoined(
        Characters.db.query.backgroundImageQuery(charId ?? -1),
        [charId],
        { deepCheck: true }
    )

    const { data: entryIdList, updatedAt } = useLiveQueryJoined(Chats.db.live.entryIdList(chatId), [
        chatId,
        {
            sync: true,
        },
    ])

    const { cause: scrollCause, index: scrollIndex } = scrollData ?? {}
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

    useEffect(() => {
        if (!scrollCause || !scrollIndex) return
        const isSave = scrollCause === 'saveScroll'
        if (!saveScroll && isSave) return
        const offset = Math.max(0, scrollIndex + (isSave ? 1 : 0))

        if (offset > 2)
            flatlistRef.current?.scrollToIndex({
                index: offset,
                animated: scrollCause === 'search',
                viewOffset: 32,
            })
    }, [scrollCause, scrollIndex, saveScroll])

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
                CellRendererComponent={({ item, index, ...rest }) => (
                    <ChatItem
                        index={item.index}
                        entryId={item.entryId}
                        isLastMessage={item.isLastMessage}
                        isGreeting={item.isGreeting}
                        {...rest}
                    />
                )}
                ref={flatlistRef}
                maintainVisibleContentPosition={
                    autoScroll ? null : { minIndexForVisible: 0, autoscrollToTopThreshold: 50 }
                }
                keyboardShouldPersistTaps="handled"
                inverted
                data={entryIdList.map((item, index) => ({
                    index: entryIdList.length - index - 1,
                    entryId: item.id,
                    isGreeting: index === entryIdList.length - 1,
                    isLastMessage: index === 0,
                }))}
                keyExtractor={(item) => item.entryId.toString()}
                renderItem={() => <></>}
                scrollEventThrottle={16}
                onViewableItemsChanged={(item) => {
                    const index = item.viewableItems?.at(0)?.index

                    if (index && chatId)
                        updateScrollPosition(
                            index - (item.viewableItems.length === 1 ? 1 : 0),
                            chatId
                        )
                    if (index) {
                        setShowJump(index > 15)
                    }
                }}
                onScrollToIndexFailed={(error) => {
                    flatlistRef.current?.scrollToOffset({
                        offset: error.averageItemLength * error.index,
                        animated: true,
                    })
                    setTimeout(() => {
                        if (entryIdList.length !== 0 && flatlistRef.current !== null) {
                            flatlistRef.current?.scrollToIndex({
                                index: error.index,
                                animated: true,
                                viewOffset: 32,
                            })
                        }
                    }, 100)
                }}
                contentContainerStyle={{
                    paddingBottom: 32,
                    rowGap: 8,
                }}
                ListFooterComponent={
                    updatedAt && (() => <ChatFooter chatLength={entryIdList.length} />)
                }
                ListHeaderComponent={() => <ChatHeader />}
            />
            <ChatJumpButton
                jump={() => {
                    setShowJump(false)
                    flatlistRef?.current?.scrollToIndex({
                        index: 0,
                        animated: false,
                        viewPosition: 1,
                    })
                }}
                visible={showJump}
            />

            <ChatHeaderGradient />
        </ImageBackground>
    )
}

export default ChatWindow
