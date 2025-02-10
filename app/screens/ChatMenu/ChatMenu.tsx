import { Ionicons } from '@expo/vector-icons'
import { Characters } from '@lib/state/Characters'
import { Chats } from '@lib/state/Chat'
import { Logger } from '@lib/state/Logger'
import { Theme } from '@lib/theme/ThemeManager'
import CharacterList from '@screens/CharacterMenu/CharacterList'
import { Stack, useFocusEffect } from 'expo-router'
import { useCallback, useRef, useState } from 'react'
import { BackHandler, Pressable, SafeAreaView, View } from 'react-native'
import { Gesture, GestureDetector } from 'react-native-gesture-handler'
import { Menu } from 'react-native-popup-menu'
import Animated, { runOnJS, ZoomIn } from 'react-native-reanimated'
import { useShallow } from 'zustand/react/shallow'

import ChatInput from './ChatInput'
import SettingsDrawer from '../SettingsDrawer/'
import AvatarViewer from './ChatWindow/AvatarViewer'
import ChatWindow from './ChatWindow/ChatWindow'
import ChatsDrawer from './ChatsDrawer'
import OptionsMenu from './OptionsMenu'

const ChatMenu = () => {
    const { color, spacing } = Theme.useTheme()
    const { unloadCharacter } = Characters.useCharacterCard(
        useShallow((state) => ({
            unloadCharacter: state.unloadCard,
        }))
    )

    const { chat, unloadChat } = Chats.useChat()

    const [showDrawer, setShowDrawer] = useState<boolean>(false)
    const [showChats, setShowChats] = useState<boolean>(false)

    const menuRef = useRef<Menu | null>(null)

    const backAction = () => {
        if (menuRef.current?.isOpen()) {
            menuRef.current.close()
            return true
        }

        if (showChats) {
            setShowChats(false)
            return true
        }

        if (chat) {
            unloadChat()
            unloadCharacter()
            Logger.debug('Returning to primary Menu')
            return true
        }
        BackHandler.exitApp()
    }

    useFocusEffect(
        useCallback(() => {
            BackHandler.removeEventListener('hardwareBackPress', backAction)
            BackHandler.addEventListener('hardwareBackPress', backAction)
            return () => {
                BackHandler.removeEventListener('hardwareBackPress', backAction)
            }
            // eslint-disable-next-line react-compiler/react-compiler
        }, [chat, showDrawer, menuRef.current?.isOpen(), showChats])
    )

    const handleLeftFling = () => {
        if (showDrawer) return setShowDrawer(false)
        if (chat) setShowChats(true)
    }

    const handleRightFlight = () => {
        if (showChats) return setShowChats(false)
        setShowDrawer(true)
    }

    const swipeDrawer = Gesture.Fling()
        .direction(1)
        .onEnd(() => {
            runOnJS(handleRightFlight)()
        })

    const swipeChats = Gesture.Fling()
        .direction(3)
        .onEnd(() => {
            runOnJS(handleLeftFling)()
        })

    const gesture = Gesture.Exclusive(swipeDrawer, swipeChats)

    const headerViewRight = (
        <Pressable
            onPressIn={() => {
                setShowChats(!showChats)
            }}>
            {showChats && (
                <Animated.View entering={ZoomIn}>
                    <Ionicons name="close" size={28} color={color.text._300} />
                </Animated.View>
            )}
            {!showChats && (
                <Animated.View entering={ZoomIn}>
                    <Ionicons name="chatbox" size={28} color={color.text._300} />
                </Animated.View>
            )}
        </Pressable>
    )

    const headerViewLeft = !showChats && (
        <Pressable
            onPressIn={() => {
                setShowDrawer(!showDrawer)
            }}>
            {showDrawer && (
                <Animated.View entering={ZoomIn}>
                    <Ionicons name="close" size={28} color={color.text._300} />
                </Animated.View>
            )}

            {!showDrawer && (
                <Animated.View entering={ZoomIn}>
                    <Ionicons name="menu" size={28} color={color.text._300} />
                </Animated.View>
            )}
        </Pressable>
    )

    return (
        <GestureDetector gesture={gesture}>
            <SafeAreaView
                style={{
                    flex: 1,
                    flexDirection: 'row',
                }}>
                <Stack.Screen
                    options={{
                        title: '',
                        headerLeft: () => headerViewLeft,
                        ...(chat ? { headerRight: () => headerViewRight } : {}),
                    }}
                />

                {!chat && <CharacterList showHeader={!showDrawer} />}
                {chat && (
                    <View
                        style={{
                            flex: 1,
                        }}>
                        <ChatWindow />
                        <View
                            style={{
                                flexDirection: 'row',
                                alignItems: 'center',
                                justifyContent: 'space-between',
                                marginVertical: spacing.m,
                                paddingHorizontal: spacing.l,
                            }}>
                            {/**TODO: This might be bad */}
                            <AvatarViewer />
                            <OptionsMenu menuRef={menuRef} showChats={setShowChats} />
                            <ChatInput />
                        </View>
                    </View>
                )}
                {showDrawer && <SettingsDrawer booleans={[showDrawer, setShowDrawer]} />}
                {showChats && <ChatsDrawer booleans={[showChats, setShowChats]} />}
            </SafeAreaView>
        </GestureDetector>
    )
}

export default ChatMenu
