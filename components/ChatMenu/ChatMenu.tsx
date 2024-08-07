import { ChatWindow } from './ChatWindow/ChatWindow'
import { Ionicons, MaterialIcons, FontAwesome, AntDesign } from '@expo/vector-icons'
import { Global, Chats, Logger, Style, Characters } from '@globals'
import { generateResponse } from '@constants/Inference'
import { Stack, useFocusEffect, useRouter } from 'expo-router'
import { useCallback, useRef, useState } from 'react'
import {
    View,
    Text,
    TextInput,
    SafeAreaView,
    TouchableOpacity,
    StyleSheet,
    BackHandler,
} from 'react-native'
import { useMMKVString } from 'react-native-mmkv'
import {
    Menu,
    MenuTrigger,
    MenuOptions,
    MenuOption,
    renderers,
    MenuOptionsCustomStyle,
} from 'react-native-popup-menu'
const { SlideInMenu } = renderers
import { useShallow } from 'zustand/react/shallow'
import Recents from './Recents'
import SettingsDrawer from './SettingsDrawer'
import { Gesture, GestureDetector } from 'react-native-gesture-handler'
import Animated, { SlideInRight, runOnJS, Easing } from 'react-native-reanimated'

const ChatMenu = () => {
    const router = useRouter()

    const { charName, unloadCharacter } = Characters.useCharacterCard(
        useShallow((state) => ({
            charName: state?.card?.data.name,
            unloadCharacter: state.unloadCard,
        }))
    )

    const [newMessage, setNewMessage] = useState<string>('')
    const [showDrawer, setDrawer] = useState<boolean>(false)
    const [userName, setUserName] = useMMKVString(Global.CurrentUser)
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

    const { insertEntry, deleteEntry, inserLastToBuffer, nowGenerating, abortFunction } =
        Chats.useChat(
            useShallow((state) => ({
                insertEntry: state.addEntry,
                deleteEntry: state.deleteEntry,
                inserLastToBuffer: state.insertLastToBuffer,
                nowGenerating: state.nowGenerating,
                abortFunction: state.abortFunction,
            }))
        )

    const handleSend = async () => {
        if (newMessage.trim() !== '') await insertEntry(userName ?? '', true, newMessage)
        await insertEntry(charName ?? '', false, '')
        setNewMessage((message) => '')
        generateResponse()
    }

    const abortResponse = async () => {
        Logger.log(`Aborting Generation`)
        if (abortFunction !== undefined) abortFunction()
    }

    type MenuData = {
        callback: () => void
        text: string
        button: 'back' | 'edit' | 'paperclip'
    }

    const menuoptions: Array<MenuData> = [
        /*{
            callback: () => {},
            text: 'Continue',
            button: 'forward',
        },
        {
            callback: () => {},
            text: 'Regenerate',
            button: 'retweet',
        },*/
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
                    Logger.log('Unimplemented', true)
                }}>
                <FontAwesome name="cog" size={28} color={Style.getColor('primary-text1')} />
            </TouchableOpacity>
        </Animated.View>
    )

    const headerViewRight = (
        <View style={styles.headerButtonContainer}>
            {/*charName !== 'Welcome' && (
                <Animated.View
                    entering={SlideInRight.withInitialValues({ originX: 150 })
                        .duration(200)
                        .easing(Easing.out(Easing.ease))}>
                    <View style={styles.headerButtonContainer}>
                        <TouchableOpacity
                            style={styles.headerButtonRight}
                            onPress={() => {
                                setCharName('Welcome')
                            }}>
                            <Ionicons name="chevron-back" size={28} color={Color.Button} />
                        </TouchableOpacity>
                        <TouchableOpacity
                            style={styles.headerButtonRight}
                            onPress={() => {
                                router.push('/ChatSelector')
                            }}>
                            <Ionicons name="chatbox" size={28} color={Color.Button} />
                        </TouchableOpacity>
                        <TouchableOpacity
                            style={styles.headerButtonRight}
                            onPress={() => router.push(`/CharInfo`)}>
                            <FontAwesome name="edit" size={28} color={Color.Button} />
                        </TouchableOpacity>
                    </View>
                </Animated.View>
                        )*/}
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
                        headerRight: () => !showDrawer && headerViewRight,
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

                            <TextInput
                                style={styles.input}
                                placeholder="Message..."
                                placeholderTextColor={Style.getColor('primary-text2')}
                                value={newMessage}
                                onChangeText={(text) => setNewMessage(text)}
                                multiline
                            />

                            {nowGenerating ? (
                                <TouchableOpacity style={styles.stopButton} onPress={abortResponse}>
                                    <MaterialIcons
                                        name="stop"
                                        color={Style.getColor('destructive-text1')}
                                        size={28}
                                    />
                                </TouchableOpacity>
                            ) : (
                                <TouchableOpacity style={styles.sendButton} onPress={handleSend}>
                                    <MaterialIcons
                                        name="send"
                                        color={Style.getColor('primary-surface1')}
                                        size={28}
                                    />
                                </TouchableOpacity>
                            )}
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
        alignItems: 'center',
        justifyContent: 'space-between',
        marginVertical: 8,
        paddingHorizontal: 12,
    },

    input: {
        color: Style.getColor('primary-text1'),
        backgroundColor: Style.getColor('primary-surface1'),
        flex: 1,
        borderWidth: 1,
        borderColor: Style.getColor('primary-brand'),
        borderRadius: 12,
        paddingHorizontal: 16,
        paddingVertical: 8,
        marginHorizontal: 8,
    },

    sendButton: {
        borderRadius: 8,
        minWidth: 44,
        minHeight: 44,
        backgroundColor: Style.getColor('primary-brand'),
        padding: 8,
    },

    stopButton: {
        borderRadius: 8,
        minWidth: 44,
        minHeight: 44,
        backgroundColor: Style.getColor('destructive-brand'),
        padding: 8,
    },

    optionsButton: {},

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
