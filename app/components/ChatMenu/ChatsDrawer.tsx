import { Ionicons, AntDesign } from '@expo/vector-icons'
import { Characters, Chats, Style } from '@globals'
import { useLiveQuery } from 'drizzle-orm/expo-sqlite'
import { SetStateAction } from 'react'
import {
    Text,
    GestureResponderEvent,
    TouchableOpacity,
    StyleSheet,
    View,
    FlatList,
    Alert,
} from 'react-native'
import Animated, {
    Easing,
    FadeIn,
    FadeOut,
    SlideInRight,
    SlideOutRight,
} from 'react-native-reanimated'

type ChatsDrawerProps = {
    booleans: [boolean, (b: boolean | SetStateAction<boolean>) => void]
}

type ListItem = {
    id: number
    character_id: number
    create_date: Date
    name: string
    last_modified: null | number
    entryCount: number
}

const ChatsDrawer: React.FC<ChatsDrawerProps> = ({ booleans: [showModal, setShowModal] }) => {
    const { charId } = Characters.useCharacterCard((state) => ({ charId: state.id }))

    const { data } = useLiveQuery(Chats.db.query.chatListQuery(charId ?? 0))

    const { deleteChat, loadChat, currentChatId } = Chats.useChat((state) => ({
        deleteChat: state.delete,
        loadChat: state.load,
        currentChatId: state.data?.id,
    }))

    const handleOverlayClick = (e: GestureResponderEvent) => {
        if (e.target === e.currentTarget) setShowModal(false)
    }

    const handleLoadChat = async (chatId: number) => {
        await loadChat(chatId)
        setShowModal(false)
    }

    const handleCreateChat = async () => {
        if (charId)
            Chats.db.mutate.createChat(charId).then((chatId) => {
                if (chatId) handleLoadChat(chatId)
            })
    }

    const handleDeleteChat = (item: ListItem) => {
        Alert.alert(
            `Delete Chat`,
            `Are you sure you want to delete this chat file: '${item.name}'?`,
            [
                {
                    text: 'Cancel',
                    onPress: () => {},
                    style: 'cancel',
                },
                {
                    text: 'Confirm',
                    onPress: async () => {
                        await deleteChat(item.id)
                        if (charId && currentChatId === item.id) {
                            const returnedChatId = await Chats.db.query.chatNewest(charId)
                            const chatId = returnedChatId
                                ? returnedChatId
                                : await Chats.db.mutate.createChat(charId)
                            chatId && (await loadChat(chatId))
                        }
                    },
                    style: 'destructive',
                },
            ]
        )
    }

    const renderChat = (item: ListItem, index: number) => {
        const date = new Date(item.last_modified ?? 0)
        return (
            <View style={item.id === currentChatId ? styles.chatItemActive : styles.chatItem}>
                <TouchableOpacity
                    style={{ flex: 1, paddingHorizontal: 2, paddingVertical: 8 }}
                    onPress={() => handleLoadChat(item.id)}>
                    <Text style={styles.title}>{item.name}</Text>
                    <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 16 }}>
                        <Ionicons
                            name="chatbox"
                            size={20}
                            color={Style.getColor('primary-text2')}
                        />
                        <Text style={styles.smallTextChat}>{item.entryCount}</Text>
                        <Text style={styles.smallText}>{date.toLocaleDateString()}</Text>
                        <Text style={styles.smallText}>{date.toLocaleTimeString()}</Text>
                    </View>
                </TouchableOpacity>
                <TouchableOpacity style={styles.editButton} onPress={() => handleDeleteChat(item)}>
                    <AntDesign color={Style.getColor('primary-text2')} name="edit" size={26} />
                </TouchableOpacity>
            </View>
        )
    }

    return (
        <View style={styles.absolute}>
            <Animated.View
                entering={FadeIn.duration(200)}
                exiting={FadeOut.duration(300)}
                style={styles.absolute}>
                <TouchableOpacity
                    activeOpacity={1}
                    onPress={handleOverlayClick}
                    style={styles.backdrop}
                />
            </Animated.View>

            <Animated.View
                style={styles.drawer}
                entering={SlideInRight.duration(200).easing(Easing.out(Easing.quad))}
                exiting={SlideOutRight.duration(300).easing(Easing.out(Easing.quad))}>
                <Text style={styles.drawerTitle}>Chats</Text>
                <FlatList
                    style={styles.listContainer}
                    data={data}
                    keyExtractor={(item) => item.id.toString()}
                    renderItem={({ item, index }) => renderChat(item, index)}
                />
                <TouchableOpacity onPress={handleCreateChat} style={styles.newButton}>
                    <Text style={{ color: Style.getColor('primary-surface2') }}>New Chat</Text>
                </TouchableOpacity>
            </Animated.View>
        </View>
    )
}

export default ChatsDrawer

const styles = StyleSheet.create({
    absolute: {
        position: 'absolute',
        width: '100%',
        height: '100%',
    },

    backdrop: {
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
        justifyContent: 'center',
        position: 'absolute',
        width: '100%',
        height: '100%',
    },

    drawer: {
        backgroundColor: Style.getColor('primary-surface1'),
        width: '80%',
        shadowColor: Style.getColor('primary-shadow'),
        left: '20%',
        borderTopWidth: 3,
        elevation: 20,
        position: 'absolute',
        height: '100%',
        paddingHorizontal: 16,
        paddingTop: 16,
        paddingBottom: 32,
    },

    drawerTitle: {
        color: Style.getColor('primary-text2'),
        fontSize: 18,
        paddingLeft: 16,
    },

    title: {
        color: Style.getColor('primary-text1'),
        fontSize: 16,
    },

    listContainer: {
        flex: 1,
        marginTop: 16,
        marginBottom: 8,
        borderRadius: 8,
    },

    chatItem: {
        paddingHorizontal: 8,
        flexDirection: 'row',
        flex: 1,
        marginBottom: 8,
        borderRadius: 8,
        borderWidth: 2,
        borderColor: Style.getColor('primary-surface1'),
    },

    chatItemActive: {
        paddingHorizontal: 8,
        flexDirection: 'row',
        flex: 1,
        marginBottom: 8,
        borderRadius: 8,
        borderWidth: 2,
        borderColor: Style.getColor('primary-brand'),
    },
    smallText: { color: Style.getColor('primary-text2'), marginLeft: 12 },
    smallTextChat: { color: Style.getColor('primary-text2'), marginLeft: 4 },

    editButton: {
        paddingHorizontal: 8,
        justifyContent: 'center',
    },

    newButton: {
        backgroundColor: Style.getColor('primary-brand'),
        alignItems: 'center',
        paddingVertical: 8,
        borderRadius: 12,
    },
})
