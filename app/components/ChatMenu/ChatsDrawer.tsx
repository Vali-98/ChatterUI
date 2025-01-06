import Drawer from '@components/Drawer'
import { Ionicons } from '@expo/vector-icons'
import { Characters, Chats, Style } from 'constants/Global'
import { useLiveQuery } from 'drizzle-orm/expo-sqlite'
import { SetStateAction, useState } from 'react'
import { Text, TouchableOpacity, StyleSheet, View, FlatList } from 'react-native'

import ChatEditPopup from './ChatEditPopup'

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
    const [nowLoading, setNowLoading] = useState<boolean>(false)
    const { data } = useLiveQuery(Chats.db.query.chatListQuery(charId ?? 0))

    const { loadChat, chatId } = Chats.useChat()

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

    const renderChat = (item: ListItem, index: number) => {
        const date = new Date(item.last_modified ?? 0)
        return (
            <View style={item.id === chatId ? styles.chatItemActive : styles.chatItem}>
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
                <ChatEditPopup item={item} nowLoading={nowLoading} setNowLoading={setNowLoading} />
            </View>
        )
    }

    return (
        <Drawer setShowDrawer={setShowModal} drawerStyle={styles.drawer} direction="right">
            <Text style={styles.drawerTitle}>Chats</Text>
            <FlatList
                style={styles.listContainer}
                data={data}
                keyExtractor={(item) => item.id.toString()}
                renderItem={({ item, index }) => renderChat(item, index)}
                showsVerticalScrollIndicator={false}
                removeClippedSubviews={false}
            />
            <TouchableOpacity onPress={handleCreateChat} style={styles.newButton}>
                <Text style={{ color: Style.getColor('primary-surface2') }}>New Chat</Text>
            </TouchableOpacity>
        </Drawer>
    )
}

export default ChatsDrawer

const styles = StyleSheet.create({
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
        alignItems: 'center',
        flexDirection: 'row',
        paddingHorizontal: 8,
        flex: 1,
        marginBottom: 8,
        borderRadius: 8,
        borderWidth: 2,
        borderColor: Style.getColor('primary-surface1'),
    },

    chatItemActive: {
        alignItems: 'center',
        flexDirection: 'row',
        paddingHorizontal: 8,
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
