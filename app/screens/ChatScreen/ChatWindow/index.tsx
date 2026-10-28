import { ImageBackground } from 'expo-image'
import { useEffect, useRef, useState } from 'react'
import { FlatList, type FlatListProps } from 'react-native'
import { useMMKVBoolean } from 'react-native-mmkv'
import { useShallow } from 'zustand/react/shallow'

import Drawer from '@components/views/Drawer'
import HeaderTitle from '@components/views/HeaderTitle'
import { AppSettings } from '@lib/constants/GlobalValues'
import { useDebounce } from '@lib/hooks/Debounce'
import { useLiveQuerySync } from '@lib/hooks/liveQuery'
import { useAppMode } from '@lib/state/AppMode'
import { useBackgroundStore } from '@lib/state/BackgroundImage'
import { Characters } from '@lib/state/characters'
import { Chats, ScrollData } from '@lib/state/chat'
import { AppDirectory } from '@lib/utils/File'

import { ChatActionAnchorProvider } from './ChatActionAnchor'
import ChatActionOverlay from './ChatActionOverlay'
import ChatFooter from './ChatFooter'
import ChatHeader from './ChatHeader'
import ChatHeaderGradient from './ChatHeaderGradient'
import ChatItem from './ChatItem'
import ChatJumpButton from './ChatJumpButton'
import ChatModelName from './ChatModelName'
import ChatNotices from '../ChatNotices'
import { NoticeStack } from '@components/views/Notice'
import DownloadNotice from '@components/downloads/DownloadNotice'

type ChatListItem = { index: number; entryId: number; isLastMessage: boolean; isGreeting: boolean }
const ChatCellRenderer: NonNullable<FlatListProps<ChatListItem>['CellRendererComponent']> = ({
    item,
    index: _cellIndex,
    ...rest
}) => (
    <ChatItem
        index={item.index}
        entryId={item.entryId}
        isLastMessage={item.isLastMessage}
        isGreeting={item.isGreeting}
        {...rest}
    />
)

type ChatWindowProps = {
    chatId: number
    scrollData?: ScrollData
}

const ChatWindow: React.FC<ChatWindowProps> = ({ chatId, scrollData }) => {
    const backgroundImage = Characters.useCharacterState((state) => state.card?.background_image)

    const { appMode } = useAppMode()
    const [saveScroll] = useMMKVBoolean(AppSettings.SaveScrollPosition)
    const [showModelname] = useMMKVBoolean(AppSettings.ShowModelInChat)
    const [showJump, setShowJump] = useState(false)
    const [autoScroll] = useMMKVBoolean(AppSettings.AutoScroll)
    const scrolledRequest = useRef<ScrollData | undefined>(undefined)

    const { data: entryIdList, updatedAt } = useLiveQuerySync(Chats.db.live.messageIds(chatId), {
        key: ['chat-entry-ids', chatId],
        watch: [{ table: 'chat_entries' }],
    })

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
            Chats.db.update.chat(chatId, { scroll_offset: position })
        }
    }, 200)

    const image = useBackgroundStore((state) => state.image)

    useEffect(() => {
        if (
            !scrollData ||
            scrolledRequest.current === scrollData ||
            scrollIndex === undefined ||
            entryIdList.length === 0
        )
            return
        const isSave = scrollCause === 'saveScroll'
        scrolledRequest.current = scrollData
        if (isSave && !saveScroll) return
        const offset = Math.min(entryIdList.length - 1, Math.max(0, scrollIndex + (isSave ? 1 : 0)))
        if (scrollCause === 'search' || offset > 2)
            flatlistRef.current?.scrollToIndex({
                index: offset,
                animated: scrollCause === 'search',
                viewOffset: 32,
            })
    }, [scrollData, scrollCause, scrollIndex, saveScroll, entryIdList.length])

    return (
        <ChatActionAnchorProvider>
            <ImageBackground
                cachePolicy="none"
                style={{ flex: 1 }}
                source={{
                    uri: backgroundImage
                        ? Characters.getCardImageUri(backgroundImage)
                        : image
                          ? AppDirectory.Assets + image
                          : '',
                }}>
                {showModelname && appMode === 'local' && (
                    <HeaderTitle
                        headerTitle={() => !showSettings && !showChat && <ChatModelName />}
                    />
                )}

                <FlatList
                    CellRendererComponent={ChatCellRenderer}
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
                    ListHeaderComponent={ChatHeader}
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

                <ChatActionOverlay chatId={chatId} />
                <NoticeStack>
                    <ChatNotices chatId={chatId} />
                    <DownloadNotice />
                </NoticeStack>
                <ChatHeaderGradient />
            </ImageBackground>
        </ChatActionAnchorProvider>
    )
}

export default ChatWindow
