import AnimatedView from '@components/AnimatedView'
import { RecentMessages } from '@constants/RecentMessages'
import { FontAwesome } from '@expo/vector-icons'
import { Global, Chats, Characters, saveStringExternal, Logger, Style } from '@globals'
import { useRouter, Stack } from 'expo-router'
import { useEffect, useState } from 'react'
import { ScrollView, View, Text, StyleSheet, Image, Alert, TouchableOpacity } from 'react-native'
import { useMMKVString } from 'react-native-mmkv'

const ChatSelector = () => {
    const router = useRouter()
    const [chats, setChats] = useState<Array<string>>([])
    const { charName, charId } = Characters.useCharacterCard((state) => ({
        charName: state.card?.data.name,
        charId: state.id,
    }))

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
            await Chats.createChat(charId ?? -1, userName ?? '')
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
                    deleteChat(charName ?? '', chatname).then(() => {
                        RecentMessages.deleteEntry(chatname)
                        Chats.getNewest(charName ?? '').then(async (filename) => {
                            if (!filename)
                                await Chats.createChat(charId ?? -1, userName ?? '').then(
                                    async (filename) =>
                                        filename && (await loadChat(charName ?? '', filename))
                                )
                            refreshfilenames()
                        })
                    })
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
        Chats.createChat(charId ?? -1, userName ?? '').then((filename) => {
            Logger.debug(`File created: ${filename}`)
            if (filename) handleSelectChat(filename)
        })
    }

    return (
        <AnimatedView dy={200} tduration={500} fade={0} fduration={500} style={{ flex: 1 }}>
            <ScrollView style={styles.mainContainer}>
                <Stack.Screen
                    options={{
                        headerRight: () => (
                            <View>
                                <TouchableOpacity onPress={handleCreateChat}>
                                    <FontAwesome
                                        name="plus"
                                        size={28}
                                        color={Style.getColor('primary-text1')}
                                    />
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
                            filename === currentChat
                                ? styles.longButtonSelectedContainer
                                : styles.longButtonContainer
                        }>
                        <Image
                            source={{ uri: Characters.getImageDir(charId ?? -1) }}
                            style={styles.avatar}
                        />
                        <Text style={styles.chatname}>{filename.replace('.jsonl', '')}</Text>

                        <TouchableOpacity
                            style={styles.button}
                            onPress={() => handleExportChat(filename)}>
                            <FontAwesome
                                name="download"
                                size={32}
                                color={Style.getColor('primary-text1')}
                            />
                        </TouchableOpacity>
                        <TouchableOpacity
                            style={styles.button}
                            onPress={() => handleDeleteChat(filename)}>
                            <FontAwesome
                                name="trash"
                                size={32}
                                color={Style.getColor('primary-text1')}
                            />
                        </TouchableOpacity>
                    </TouchableOpacity>
                ))}
            </ScrollView>
        </AnimatedView>
    )
}

export default ChatSelector

const styles = StyleSheet.create({
    mainContainer: {
        paddingVertical: 16,
        paddingHorizontal: 8,
    },

    chatname: {
        color: Style.getColor('primary-text2'),
        marginLeft: 8,
        flex: 1,
    },

    longButtonContainer: {
        backgroundColor: Style.getColor('primary-surface1'),
        borderColor: Style.getColor('primary-surface1'),
        borderWidth: 2,
        flexDirection: 'row',
        marginBottom: 8,
        justifyContent: 'space-between',
        alignItems: 'center',
        borderRadius: 8,
        paddingVertical: 8,
        padding: 8,
        flex: 1,
    },

    longButtonSelectedContainer: {
        backgroundColor: Style.getColor('primary-surface1'),
        borderColor: Style.getColor('primary-brand'),
        borderWidth: 2,
        flexDirection: 'row',
        marginBottom: 8,
        justifyContent: 'space-between',
        alignItems: 'center',
        borderRadius: 8,
        paddingVertical: 8,
        padding: 8,
        flex: 1,
    },

    avatar: {
        width: 48,
        height: 48,
        borderRadius: 12,
        margin: 4,
        backgroundColor: 'gray',
    },

    button: {
        marginRight: 8,
        marginLeft: 16,
    },
})
