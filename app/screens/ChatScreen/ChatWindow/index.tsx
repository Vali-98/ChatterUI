import { eq } from 'drizzle-orm'
import { useLiveQuery } from 'drizzle-orm/expo-sqlite'
import { ImageBackground } from 'expo-image'
import { useEffect, useRef } from 'react'
import { FlatList, StyleSheet, View } from 'react-native'
import { useMMKVBoolean } from 'react-native-mmkv'
import Animated, { FadeIn, FadeOut, LinearTransition } from 'react-native-reanimated'
import { useShallow } from 'zustand/react/shallow'

import Drawer from '@components/views/Drawer'
import HeaderTitle from '@components/views/HeaderTitle'
import Live2DViewer from '@components/views/Live2DViewer'
import { AppSettings } from '@lib/constants/GlobalValues'
import { useDebounce } from '@lib/hooks/Debounce'
import { useAppMode } from '@lib/state/AppMode'
import { useBackgroundStore } from '@lib/state/BackgroundImage'
import { Characters } from '@lib/state/Characters'
import { Chats } from '@lib/state/Chat'
import { AppDirectory } from '@lib/utils/File'
import { db } from '@db'

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

    // ── Background image (existing) ──────────────────────────────────────────
    const { data: { background_image: backgroundImage } = {} } = useLiveQuery(
        Characters.db.query.backgroundImageQuery(charId ?? -1)
    )

    // ── Live2D model path ────────────────────────────────────────────────────
    const { data: live2dRow } = useLiveQuery(
        db.query.characters.findFirst({
            where: eq(db._.$inferSelect.characters.id, charId ?? -1) as any,
            columns: { live2d_model_path: true },
        })
    )
    const live2dModelPath: string | null = (live2dRow as any)?.live2d_model_path ?? null
    // VN mode is active whenever this character has a Live2D model assigned
    const isVNMode = !!live2dModelPath

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
        const offset = Math.max(0, scrollIndex + (isSave ? 1 : 0))

        if (offset > 2)
            flatlistRef.current?.scrollToIndex({
                index: offset,
                animated: scrollCause === 'search',
                viewOffset: 32,
            })
    }, [scrollCause, scrollIndex, saveScroll])

    const renderItems = ({ item }: { item: ListItem }) => {
        return (
            <ChatItem
                index={item.index}
                isLastMessage={item.isLastMessage}
                isGreeting={item.isGreeting}
                vnMode={isVNMode}
            />
        )
    }

    // ── VN mode: Live2D fills the screen, messages in a semi-transparent overlay
    if (isVNMode && live2dModelPath) {
        return (
            <View style={styles.vnContainer}>
                {/* ── Layer 0: Live2D model (full screen, behind everything) ── */}
                <Live2DViewer modelPath={live2dModelPath} />

                {/* ── Layer 1: Dark gradient at the bottom for readability ─── */}
                <View style={styles.vnGradientOverlay} pointerEvents="none" />

                {/* ── Layer 2: Chat messages ──────────────────────────────── */}
                {showModelname && appMode === 'local' && (
                    <HeaderTitle
                        headerTitle={() => !showSettings && !showChat && <ChatModelName />}
                    />
                )}

                <FlatList
                    style={styles.vnFlatList}
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
                        rowGap: 4,
                    }}
                    ListFooterComponent={() => <ChatFooter />}
                />

                <ChatHeaderGradient />
            </View>
        )
    }

    // ── Standard mode (existing behaviour, unchanged) ────────────────────────
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

const styles = StyleSheet.create({
    // VN mode ──────────────────────────────────────────────────────────────────
    vnContainer: {
        flex: 1,
        backgroundColor: '#000',
    },
    /** Semi-transparent dark gradient covering the lower 50% of the screen */
    vnGradientOverlay: {
        ...StyleSheet.absoluteFillObject,
        // Darker at the bottom where messages appear, transparent at the top
        background: 'linear-gradient(to top, rgba(0,0,0,0.70) 0%, rgba(0,0,0,0.0) 55%)',
        // Fallback for RN (linear-gradient not supported natively, use expo-linear-gradient)
        backgroundColor: 'transparent',
        top: '50%',
        bottom: 0,
        opacity: 0.7,
    },
    vnFlatList: {
        flex: 1,
    },
})

export default ChatWindow
