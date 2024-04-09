import AnimatedView from '@components/AnimatedView'
import { RecentMessages } from '@constants/RecentMessages'
import { FontAwesome } from '@expo/vector-icons'
import { Chats, Characters, saveStringExternal, Logger, Style } from '@globals'
import { useRouter, Stack } from 'expo-router'
import { useEffect, useState } from 'react'
import { ScrollView, View, Text, StyleSheet, Image, Alert, TouchableOpacity } from 'react-native'
import { useShallow } from 'zustand/react/shallow'

type ListItem = {
    id: number
    character_id: number
    createDate: Date
}

const ChatSelector = () => {
    const router = useRouter()
    const [chats, setChats] = useState<Array<ListItem>>([])
    const { charName, charId, imageId } = Characters.useCharacterCard(
        useShallow((state) => ({
            charName: state.card?.data.name,
            charId: state.id,
            imageId: state.card?.data.image_id,
        }))
    )

    useEffect(() => {
        refreshfilenames()
    }, [])

    const { deleteChat, loadChat, currentChatId } = Chats.useChat((state) => ({
        deleteChat: state.delete,
        loadChat: state.load,
        currentChatId: state.data?.id,
    }))

    const refreshfilenames = async () => {
        if (!charId) return
        const list = await Chats.getList(charId)
        if (list.length === 0) {
            await Chats.createChat(charId)
            refreshfilenames()
            return
        }
        if (charName && currentChatId && !list.some((item) => item.id === currentChatId)) {
            loadChat(list[0].id)
        }
        setChats(list)
    }

    const handleDeleteChat = (chatId: number) => {
        Alert.alert(`Delete Chat`, `Are you sure you want to delete this chat file?`, [
            {
                text: 'Cancel',
                onPress: () => {},
                style: 'cancel',
            },
            {
                text: 'Confirm',
                onPress: async () => {
                    await deleteChat(chatId)
                    RecentMessages.deleteEntry(chatId)
                    if (charId && currentChatId === chatId) {
                        const returnedChatId = await Chats.getNewest(charId)
                        const chatId = returnedChatId
                            ? returnedChatId
                            : await Chats.createChat(charId)
                        chatId && (await loadChat(chatId))
                    }
                    refreshfilenames()
                },
                style: 'destructive',
            },
        ])
    }

    const handleExportChat = async (chatId: number) => {
        saveStringExternal(
            `Chatlogs-${charName}-${chatId}`,
            JSON.stringify(await Chats.readChat(chatId)),
            'application/*'
        ).catch((error) => {
            Logger.log(`Could not save file. ${error}`, true)
        })
    }

    const handleSelectChat = async (chatId: number) => {
        await loadChat(chatId)
        router.back()
    }

    const handleCreateChat = async () => {
        if (charId)
            Chats.createChat(charId).then((filename) => {
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
                {chats.reverse().map((item, index) => (
                    <TouchableOpacity
                        key={index}
                        onPress={() => handleSelectChat(item.id)}
                        style={
                            item.id === currentChatId
                                ? styles.longButtonSelectedContainer
                                : styles.longButtonContainer
                        }>
                        <Image
                            source={{ uri: Characters.getImageDir(imageId ?? -1) }}
                            style={styles.avatar}
                        />
                        <Text style={styles.chatname}>{item.createDate.toLocaleTimeString()}</Text>

                        <TouchableOpacity
                            style={styles.button}
                            onPress={() => handleExportChat(item.id)}>
                            <FontAwesome
                                name="download"
                                size={32}
                                color={Style.getColor('primary-text1')}
                            />
                        </TouchableOpacity>
                        <TouchableOpacity
                            style={styles.button}
                            onPress={() => handleDeleteChat(item.id)}>
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
