import { Ionicons, FontAwesome, AntDesign } from '@expo/vector-icons'
import { Logger, Style, Characters } from '@globals'
import { Stack, useFocusEffect, useRouter } from 'expo-router'
import { useCallback, useRef, useState } from 'react'
import { View, Text, SafeAreaView, TouchableOpacity, StyleSheet, BackHandler } from 'react-native'
import { Gesture, GestureDetector } from 'react-native-gesture-handler'
import {
    Menu,
    MenuTrigger,
    MenuOptions,
    MenuOption,
    renderers,
    MenuOptionsCustomStyle,
} from 'react-native-popup-menu'
import Animated, { SlideInRight, runOnJS, Easing } from 'react-native-reanimated'
import { useShallow } from 'zustand/react/shallow'

import ChatInput from './ChatInput'
import { ChatWindow } from './ChatWindow/ChatWindow'
import Recents from './Recents'
import SettingsDrawer from './SettingsDrawer'

const { SlideInMenu } = renderers

type MenuData = {
    callback: () => void
    text: string
    button: 'back' | 'edit' | 'paperclip'
}

const ChatMenu = () => {
    const router = useRouter()
    const { charName, unloadCharacter } = Characters.useCharacterCard(
        useShallow((state) => ({
            charName: state?.card?.data.name,
            unloadCharacter: state.unloadCard,
        }))
    )

    const [showDrawer, setDrawer] = useState<boolean>(false)
    const menuRef = useRef<Menu | null>(null)

    const setShowDrawer = (show: boolean | ((b: boolean) => void)) => {
        if (typeof show === 'boolean') setDrawer(show)
        else Logger.debug('This was not supposed to be used!')
        if (menuRef.current?.isOpen()) {
            menuRef.current.close()
        }
    }

    const backAction = () => {
        if (menuRef.current?.isOpen()) {
            menuRef.current.close()
            return true
        }

        if (showDrawer) {
            setShowDrawer(false)
            Logger.debug('Closing Drawer')
            return true
        }

        if (charName) {
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
        }, [charName, showDrawer, menuRef.current?.isOpen()])
    )

    const goToChars = () => {
        if (showDrawer) setShowDrawer(false)
        else router.push('/CharMenu')
    }

    const swipeDrawer = Gesture.Fling()
        .direction(1)
        .onEnd(() => {
            runOnJS(setShowDrawer)(true)
        })

    const swipeChar = Gesture.Fling()
        .direction(3)
        .onEnd(() => {
            runOnJS(goToChars)()
        })

    const gesture = Gesture.Exclusive(swipeDrawer, swipeChar)
    const menuoptions: MenuData[] = [
        {
            callback: () => {
                unloadCharacter()
            },
            text: 'Main Menu',
            button: 'back',
        },
        {
            callback: () => {
                router.push('/CharInfo')
            },
            text: 'Edit Character',
            button: 'edit',
        },
        {
            callback: () => {
                router.push('/ChatSelector')
            },
            text: 'Chat History',
            button: 'paperclip',
        },
    ]

    const modificationMenu = (
        <Menu renderer={SlideInMenu} ref={menuRef}>
            <MenuTrigger>
                <Ionicons
                    name="ellipsis-vertical-circle"
                    style={styles.optionsButton}
                    size={32}
                    color={Style.getColor('primary-text2')}
                />
            </MenuTrigger>
            <MenuOptions customStyles={menustyle}>
                {menuoptions.map((item, index) => (
                    <MenuOption key={index} onSelect={item.callback}>
                        <View
                            style={
                                index === menuoptions.length - 1
                                    ? styles.optionItemLast
                                    : styles.optionItem
                            }>
                            <AntDesign
                                style={{ minWidth: 25, marginLeft: 5 }}
                                name={item.button}
                                color={Style.getColor('primary-text2')}
                                size={24}
                            />
                            <Text style={styles.optionText}>{item.text}</Text>
                        </View>
                    </MenuOption>
                ))}
            </MenuOptions>
        </Menu>
    )

    const headerViewRightSettings = (
        <Animated.View
            entering={SlideInRight.withInitialValues({ originX: 150 })
                .duration(200)
                .easing(Easing.out(Easing.ease))}>
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
                entering={SlideInRight.withInitialValues({ originX: 200 })
                    .duration(200)
                    .easing(Easing.out(Easing.ease))}>
                <TouchableOpacity
                    style={styles.headerButtonRight}
                    onPress={() => {
                        router.push('/CharMenu')
                    }}>
                    <Ionicons name="person" size={28} color={Style.getColor('primary-text1')} />
                </TouchableOpacity>
            </Animated.View>
        </View>
    )

    const headerViewLeft = (
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
                        headerRight: () => (showDrawer ? headerViewRightSettings : headerViewRight),
                        headerLeft: () => headerViewLeft,
                    }}
                />

                {!charName ? (
                    <Recents />
                ) : (
                    <View style={styles.container}>
                        <ChatWindow />

                        <View style={styles.inputContainer}>
                            {modificationMenu}
                            <ChatInput />
                        </View>
                    </View>
                )}

                <SettingsDrawer booleans={[showDrawer, setShowDrawer]} />
            </SafeAreaView>
        </GestureDetector>
    )
}

const menustyle: MenuOptionsCustomStyle = {
    optionsContainer: {
        backgroundColor: Style.getColor('primary-surface1'),
        padding: 4,
        borderRadius: 8,
    },
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

    optionItem: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingBottom: 8,
        borderBottomColor: Style.getColor('primary-surface3'),
        borderBottomWidth: 1,
    },

    optionItemLast: {
        flexDirection: 'row',
        alignItems: 'center',
    },

    optionText: {
        color: Style.getColor('primary-text1'),
        marginLeft: 16,
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
