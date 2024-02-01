import { FontAwesome } from '@expo/vector-icons'
import { Global, Color, Chats, Characters, saveStringExternal, Logger, Messages } from '@globals'
import { useRouter, Stack } from 'expo-router'
import { useEffect, useState } from 'react'
import { ScrollView, View, Text, StyleSheet, Image, Alert, TouchableOpacity } from 'react-native'
import { useMMKVString } from 'react-native-mmkv'

const ChatSelector = () => {
    const router = useRouter()
    const [chats, setChats] = useState([])
    const [currentChat, setCurrentChat] = useMMKVString(Global.CurrentChat)
    const [charName, setCharName] = useMMKVString(Global.CurrentCharacter)
    const [userName, setUserName] = useMMKVString(Global.CurrentUser)

    useEffect(() => {
        refreshfilenames()
    }, [])

    const refreshfilenames = () => {
        Chats.getFileList(charName).then(setChats)
    }

    const deleteChat = (chatname) => {
        Alert.alert(`Delete Chat`, `Are you sure you want to delete this chat file?`, [
            {
                text: 'Cancel',
                onPress: () => {},
                style: 'cancel',
            },
            {
                text: 'Confirm',
                onPress: () => {
                    Chats.deleteFile(charName, chatname).then(() =>
                        Chats.getNewest(charName).then((filename) => {
                            setCurrentChat(filename)
                            refreshfilenames()
                        })
                    )
                },
                style: 'destructive',
            },
        ])
    }

    const exportChat = async (chatname) => {
        saveStringExternal(
            chatname,
            await Chats.getFile(charName, chatname),
            'application/*'
        ).catch((error) => {
            Logger.log(`Could not save file. ${error}`, true)
        })
    }

    const handleSelectChat = async (filename) => {
        setCurrentChat(filename)
        Chats.getFile(charName, filename).then((chat) => {
            Messages.set(chat)
        })
        router.back()
    }

    return (
        <ScrollView style={styles.mainContainer}>
            <Stack.Screen
                options={{
                    headerRight: () => (
                        <View style={styles.headerButtonContainer}>
                            <TouchableOpacity
                                style={styles.headerButtonRight}
                                onPress={() => {
                                    // create new default chat from globals
                                    Chats.createDefault(charName, userName).then((filename) =>
                                        handleSelectChat(filename)
                                    )
                                }}>
                                <FontAwesome name="plus" size={28} color={Color.Button} />
                            </TouchableOpacity>
                        </View>
                    ),
                }}
            />
            {chats.reverse().map((filename, index) => (
                <TouchableOpacity
                    key={index}
                    onPress={() => handleSelectChat(filename)}
                    style={
                        filename === currentChat ? styles.selectedchatlogitem : styles.chatlogitem
                    }>
                    <Image
                        source={{ uri: Characters.getImageDir(charName) }}
                        style={styles.avatar}
                    />
                    <Text style={styles.chatname}>{filename.replace('.jsonl', '')}</Text>

                    <TouchableOpacity style={styles.button} onPress={() => exportChat(filename)}>
                        <FontAwesome name="download" size={32} color={Color.Button} />
                    </TouchableOpacity>
                    <TouchableOpacity style={styles.button} onPress={() => deleteChat(filename)}>
                        <FontAwesome name="trash" size={32} color={Color.Button} />
                    </TouchableOpacity>
                </TouchableOpacity>
            ))}
        </ScrollView>
    )
}

export default ChatSelector

const styles = StyleSheet.create({
    mainContainer: {
        paddingHorizontal: 16,
        backgroundColor: Color.Background,
    },

    chatname: {
        color: Color.Text,
        flex: 1,
    },

    chatlogitem: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        padding: 12,
        borderRadius: 8,
        marginVertical: 4,
        backgroundColor: Color.DarkContainer,
    },

    selectedchatlogitem: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        padding: 12,
        borderRadius: 8,
        marginVertical: 4,
        backgroundColor: Color.Container,
    },

    avatar: {
        width: 48,
        height: 48,
        borderRadius: 16,
        marginRight: 8,
    },

    button: {
        marginRight: 8,
        marginLeft: 16,
    },
})
