import ChatMenu from '@components/ChatMenu/ChatMenu'
import { FontAwesome } from '@expo/vector-icons'
import { Global, Color, Chats, Characters, saveStringExternal, Logger } from '@globals'
import { useRouter, Stack } from 'expo-router'
import { useEffect, useState } from 'react'
import { ScrollView, View, Text, StyleSheet, Image, Alert, TouchableOpacity } from 'react-native'
import { useMMKVString } from 'react-native-mmkv'

const ChatSelector = () => {
    const router = useRouter()
    const [chats, setChats] = useState<Array<string>>([])
    const [charName, setCharName] = useMMKVString(Global.CurrentCharacter)
    const [userName, setUserName] = useMMKVString(Global.CurrentUser)

    useEffect(() => {
        refreshfilenames()
    }, [])

    const { deleteChat, loadChat, currentChat } = Chats.useChat((state) => ({
        deleteChat: state.delete,
        loadChat: state.load,
        currentChat: state.name,
    }))

    const refreshfilenames = async () => {
        const list = await Chats.getList(charName ?? '')
        if (list.length === 0) {
            await Chats.createChat(charName ?? '', userName ?? '')
            refreshfilenames()
            return
        }
        if (charName && currentChat && !list.includes(currentChat)) {
            loadChat(charName, list[0])
        }
        setChats(list)
    }

    const handleDeleteChat = (chatname: string) => {
        Alert.alert(`Delete Chat`, `Are you sure you want to delete this chat file?`, [
            {
                text: 'Cancel',
                onPress: () => {},
                style: 'cancel',
            },
            {
                text: 'Confirm',
                onPress: () => {
                    deleteChat(charName ?? '', chatname).then(() =>
                        Chats.getNewest(charName ?? '').then(async (filename) => {
                            if (!filename)
                                await Chats.createChat(charName ?? '', userName ?? '').then(
                                    async (filename) =>
                                        filename && (await loadChat(charName ?? '', filename))
                                )
                            refreshfilenames()
                        })
                    )
                },
                style: 'destructive',
            },
        ])
    }

    const handleExportChat = async (chatName: string) => {
        saveStringExternal(
            chatName,
            await Chats.getFileString(charName ?? '', chatName),
            'application/*'
        ).catch((error) => {
            Logger.log(`Could not save file. ${error}`, true)
        })
    }

    const handleSelectChat = async (chatName: string) => {
        await loadChat(charName ?? '', chatName)
        router.back()
    }

    const handleCreateChat = async () => {
        Chats.createChat(charName ?? '', userName ?? '').then((filename) => {
            Logger.debug(`File created: ${filename}`)
            if (filename) handleSelectChat(filename)
        })
    }

    return (
        <ScrollView style={styles.mainContainer}>
            <Stack.Screen
                options={{
                    headerRight: () => (
                        <View>
                            <TouchableOpacity onPress={handleCreateChat}>
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

                    <TouchableOpacity
                        style={styles.button}
                        onPress={() => handleExportChat(filename)}>
                        <FontAwesome name="download" size={32} color={Color.Button} />
                    </TouchableOpacity>
                    <TouchableOpacity
                        style={styles.button}
                        onPress={() => handleDeleteChat(filename)}>
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
