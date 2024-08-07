import { ChatWindow } from '@components/ChatMenu/ChatWindow/ChatWindow'
import { Ionicons, MaterialIcons, FontAwesome } from '@expo/vector-icons'
import { Global, Color, Chats, Messages } from '@globals'
import { generateResponse } from '@lib/Inference'
import { Stack, useRouter } from 'expo-router'
import { useState, useEffect } from 'react'
import { View, Text, TextInput, SafeAreaView, TouchableOpacity, StyleSheet } from 'react-native'
import { useMMKVString, useMMKVBoolean, useMMKVObject } from 'react-native-mmkv'
import { Menu, MenuTrigger, MenuOptions, MenuOption } from 'react-native-popup-menu'

const Home = () => {
    const router = useRouter()

    const [charName, setCharName] = useMMKVString(Global.CurrentCharacter)
    const [currentChat, setCurrentChat] = useMMKVString(Global.CurrentChat)
    const [nowGenerating, setNowGenerating] = useMMKVBoolean(Global.NowGenerating)
    const [messages, setMessages] = useMMKVObject(Global.Messages)

    const [newMessage, setNewMessage] = useState('')
    // dynamically set abort function that is set by respective API
    const [abortFunction, setAbortFunction] = useState(undefined)

    useEffect(() => {
        nowGenerating && startInference()

        if (
            !nowGenerating &&
            currentChat !== '' &&
            charName !== 'Welcome' &&
            messages.length !== 0
        ) {
            console.log(`Saving chat`)
            Chats.saveFile(messages, charName, currentChat)
        }
    }, [nowGenerating])

    const startInference = async () => {
        setNewMessage((message) => '')
        generateResponse(setAbortFunction, Messages.insert, messages)
    }

    const handleSend = () => {
        if (newMessage.trim() !== '') Messages.insertUserEntry(newMessage)
        Messages.insertCharacterEntry()
        setNowGenerating(true)
    }

    const abortResponse = () => {
        console.log(`Aborting Generation`)
        if (abortFunction !== undefined) abortFunction()
    }

    const regenerateResponse = () => {
        console.log('Regenerate Response')
        console.log(messages.length)
        if (messages.at(-1)?.name === charName && messages.length !== 2) {
            setMessages(messages.slice(0, -1))
        }
        Messages.insertCharacterEntry()
        setNowGenerating(true)
    }

    const continueResponse = () => {
        console.log(`Continuing Reponse`)
        setNowGenerating(true)
    }

    const menuoptions = [
        { callback: abortResponse, text: 'Stop', button: 'stop' },
        { callback: continueResponse, text: 'Continue', button: 'arrow-forward' },
        { callback: regenerateResponse, text: 'Regenerate', button: 'reload' },
    ]

    return (
        <SafeAreaView style={styles.safeArea}>
            <Stack.Screen
                options={{
                    title: '',
                    headerRight: () => (
                        <View style={styles.headerButtonContainer}>
                            {charName !== 'Welcome' && (
                                <View style={styles.headerButtonContainer}>
                                    <TouchableOpacity
                                        style={styles.headerButtonRight}
                                        onPress={() => {
                                            router.push('ChatSelector')
                                        }}>
                                        <Ionicons name="chatbox" size={28} color={Color.Button} />
                                    </TouchableOpacity>
                                    <TouchableOpacity
                                        style={styles.headerButtonRight}
                                        onPress={() => router.push(`CharInfo`)}>
                                        <FontAwesome name="cog" size={28} color={Color.Button} />
                                    </TouchableOpacity>
                                </View>
                            )}
                            <TouchableOpacity
                                style={styles.headerButtonRight}
                                onPress={() => {
                                    router.push('CharMenu')
                                }}>
                                <Ionicons name="person" size={28} color={Color.Button} />
                            </TouchableOpacity>
                        </View>
                    ),
                    headerLeft: () => (
                        <TouchableOpacity
                            style={styles.headerButtonLeft}
                            onPress={() => router.push('Settings')}>
                            <Ionicons name="menu" size={28} color={Color.Button} />
                        </TouchableOpacity>
                    ),
                }}
            />

            {charName === 'Welcome' ? (
                <View>
                    <Text style={styles.welcometext}>Select A Character To Get Started!</Text>
                </View>
            ) : (
                <View style={styles.container}>
                    <ChatWindow messages={messages} />

                    <View style={styles.inputContainer}>
                        <Menu>
                            <MenuTrigger>
                                <MaterialIcons
                                    name="menu"
                                    style={styles.optionsButton}
                                    size={36}
                                    color={Color.Button}
                                />
                            </MenuTrigger>
                            <MenuOptions customStyles={styles.optionMenu}>
                                {menuoptions.map((item, index) => (
                                    <MenuOption key={index} onSelect={item.callback}>
                                        <View
                                            style={
                                                index === menuoptions.length - 1
                                                    ? styles.optionItemLast
                                                    : styles.optionItem
                                            }>
                                            <Ionicons
                                                name={item.button}
                                                color={Color.Button}
                                                size={24}
                                            />
                                            <Text style={styles.optionText}>{item.text}</Text>
                                        </View>
                                    </MenuOption>
                                ))}
                            </MenuOptions>
                        </Menu>

                        <TextInput
                            style={styles.input}
                            placeholder="Message..."
                            placeholderTextColor={Color.Offwhite}
                            value={newMessage}
                            onChangeText={(text) => setNewMessage(text)}
                            multiline
                        />

                        {nowGenerating ? (
                            <TouchableOpacity style={styles.sendButton} onPress={abortResponse}>
                                <MaterialIcons name="stop" color={Color.Button} size={30} />
                            </TouchableOpacity>
                        ) : (
                            <TouchableOpacity style={styles.sendButton} onPress={handleSend}>
                                <MaterialIcons name="send" color={Color.Button} size={30} />
                            </TouchableOpacity>
                        )}
                    </View>
                </View>
            )}
        </SafeAreaView>
    )
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    safeArea: {
        flex: 1,
    },

    welcometext: {
        justifyContent: 'center',
        margin: 40,
        fontSize: 20,
        color: Color.Text,
    },

    inputContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 8,
        paddingVertical: 8,
    },
    input: {
        color: Color.Text,
        backgroundColor: Color.DarkContainer,
        flex: 1,
        borderWidth: 1,
        borderColor: '#ccc',
        borderRadius: 24,
        paddingHorizontal: 16,
        paddingVertical: 8,
    },

    sendButton: {
        marginLeft: 8,
        padding: 8,
    },

    optionsButton: {
        marginRight: 4,
    },

    optionMenu: {
        optionsContainer: {
            backgroundColor: Color.DarkContainer,
            padding: 4,
            borderRadius: 8,
            borderColor: Color.Offwhite,
            borderWidth: 1,
        },
    },

    optionItem: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingBottom: 8,
        borderBottomColor: Color.Offwhite,
        borderBottomWidth: 1,
    },
    optionItemLast: {
        flexDirection: 'row',
        alignItems: 'center',
    },

    optionText: {
        color: Color.Text,
        marginLeft: 16,
    },

    navbar: {
        alignItems: 'center',
        paddingRight: 100,
    },

    headerButtonRight: {
        marginLeft: 20,
        marginRight: 4,
    },

    headerButtonLeft: {
        marginRight: 20,
    },

    headerButtonContainer: {
        flexDirection: 'row',
    },
})

export default Home
