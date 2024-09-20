import CharacterList from '@components/CharacterMenu/CharacterList'
import { Ionicons, FontAwesome } from '@expo/vector-icons'
import { Logger, Style, Characters, Chats } from '@globals'
import { Stack, useFocusEffect, useRouter } from 'expo-router'
import { useCallback, useRef, useState } from 'react'
import { View, SafeAreaView, TouchableOpacity, StyleSheet, BackHandler } from 'react-native'
import { Gesture, GestureDetector } from 'react-native-gesture-handler'
import { Menu } from 'react-native-popup-menu'
import Animated, { SlideInRight, runOnJS, Easing, SlideOutRight } from 'react-native-reanimated'
import { useShallow } from 'zustand/react/shallow'

import ChatInput from './ChatInput'
import { ChatWindow } from './ChatWindow/ChatWindow'
import ChatsDrawer from './ChatsDrawer'
import OptionsMenu from './OptionsMenu'
import SettingsDrawer from './SettingsDrawer'

const ChatMenu = () => {
    const router = useRouter()
    const { unloadCharacter } = Characters.useCharacterCard(
        useShallow((state) => ({
            unloadCharacter: state.unloadCard,
        }))
    )

    const { chat, unloadChat } = Chats.useChat((state) => ({
        chat: state.data,
        unloadChat: state.reset,
    }))

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
            Logger.debug('Closing Chats')
            return true
        }

        if (showDrawer) {
            setShowDrawer(false)
            Logger.debug('Closing Drawer')
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

    const headerViewRightSettings = (
        <Animated.View
            collapsable={false}
            entering={SlideInRight.withInitialValues({ originX: 150 })
                .easing(Easing.out(Easing.ease))
                .duration(300)}
            exiting={SlideOutRight.duration(500).easing(Easing.out(Easing.linear))}>
            <TouchableOpacity
                style={styles.headerButtonRight}
                onPress={() => {
                    router.push('/AppSettingsMenu')
                }}>
                <FontAwesome name="cog" size={28} color={Style.getColor('primary-text1')} />
            </TouchableOpacity>
        </Animated.View>
    )

    const headerViewRight = (
        <View style={styles.headerButtonContainer}>
            <Animated.View
                collapsable={false}
                entering={SlideInRight.withInitialValues({ originX: 200 })
                    .easing(Easing.out(Easing.ease))
                    .duration(300)}
                exiting={SlideOutRight.duration(500).easing(Easing.out(Easing.linear))}>
                <TouchableOpacity
                    style={styles.headerButtonRight}
                    onPress={() => {
                        setShowChats(!showChats)
                    }}>
                    <Ionicons
                        name={showChats ? 'close' : 'chatbox'}
                        size={28}
                        color={Style.getColor('primary-text1')}
                    />
                </TouchableOpacity>
            </Animated.View>
        </View>
    )

    const headerViewLeft = !showChats && (
        <TouchableOpacity
            style={styles.headerButtonLeft}
            onPress={() => {
                setShowDrawer(!showDrawer)
            }}>
            {showDrawer ? (
                <Ionicons name="close" size={28} color={Style.getColor('primary-text1')} />
            ) : (
                <Ionicons name="menu" size={28} color={Style.getColor('primary-text1')} />
            )}
        </TouchableOpacity>
    )

    return (
        <GestureDetector gesture={gesture}>
            <SafeAreaView style={styles.safeArea}>
                <Stack.Screen
                    options={{
                        title: '',
                        headerLeft: () => headerViewLeft,

                        headerRight: () => {
                            if (showDrawer) return headerViewRightSettings
                            if (chat) return headerViewRight
                        },
                    }}
                />

                {!chat ? (
                    <CharacterList showHeader={!showDrawer} />
                ) : (
                    <View style={styles.container}>
                        <ChatWindow />

                        <View style={styles.inputContainer}>
                            <OptionsMenu menuRef={menuRef} />
                            <ChatInput />
                        </View>
                    </View>
                )}
                <ChatsDrawer booleans={[showChats, setShowChats]} />
                <SettingsDrawer booleans={[showDrawer, setShowDrawer]} />
            </SafeAreaView>
        </GestureDetector>
    )
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },

    safeArea: {
        flex: 1,
        flexDirection: 'row',
    },

    welcometext: {
        justifyContent: 'center',
        margin: 30,
        flex: 1,
        fontSize: 20,
        color: Style.getColor('primary-text1'),
    },

    inputContainer: {
        flexDirection: 'row',
        alignItems: 'flex-end',
        justifyContent: 'space-between',
        marginVertical: 8,
        paddingHorizontal: 12,
    },

    optionsButton: {
        paddingBottom: 6,
    },

    headerButtonRight: {
        marginLeft: 20,
        marginRight: 4,
    },

    headerButtonLeft: {
        marginRight: 20,
        padding: 2,
    },

    headerButtonContainer: {
        flexDirection: 'row',
    },
})

export default ChatMenu
