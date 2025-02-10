import ThemedButton from '@components/buttons/ThemedButton'
import Drawer from '@components/views/Drawer'
import { Ionicons } from '@expo/vector-icons'
import { Characters } from '@lib/state/Characters'
import { Chats } from '@lib/state/Chat'
import { Theme } from '@lib/theme/ThemeManager'
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
    const styles = useStyles()
    const { color, spacing } = Theme.useTheme()

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
                    style={{ flex: 1, paddingHorizontal: spacing.xs, paddingVertical: spacing.m }}
                    onPress={() => handleLoadChat(item.id)}>
                    <Text style={styles.title}>{item.name}</Text>
                    <View
                        style={{
                            flexDirection: 'row',
                            alignItems: 'center',
                            marginTop: spacing.xl,
                        }}>
                        <Ionicons name="chatbox" size={20} color={color.text._400} />
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
            <ThemedButton label="New Chat" onPress={handleCreateChat} />
        </Drawer>
    )
}

export default ChatsDrawer

const useStyles = () => {
    const { color, spacing, borderWidth, borderRadius, fontSize } = Theme.useTheme()

    return StyleSheet.create({
        drawer: {
            backgroundColor: color.neutral._100,
            width: '80%',
            shadowColor: color.shadow,
            left: '20%',
            borderTopWidth: 3,
            elevation: 20,
            position: 'absolute',
            height: '100%',
            paddingHorizontal: spacing.xl,
            paddingTop: spacing.xl,
            paddingBottom: spacing.xl2,
        },

        drawerTitle: {
            color: color.text._300,
            fontSize: fontSize.xl,
            paddingLeft: spacing.xl,
        },

        title: {
            color: color.text._100,
            fontSize: fontSize.l,
        },

        listContainer: {
            flex: 1,
            marginTop: spacing.xl,
            marginBottom: spacing.l,
        },

        chatItem: {
            alignItems: 'center',
            flexDirection: 'row',
            paddingHorizontal: spacing.m,
            flex: 1,
            marginBottom: spacing.m,
            borderRadius: borderRadius.m,
            borderWidth: borderWidth.m,
            borderColor: color.neutral._100,
        },

        chatItemActive: {
            alignItems: 'center',
            flexDirection: 'row',
            paddingHorizontal: spacing.m,
            flex: 1,
            marginBottom: spacing.m,
            borderRadius: spacing.m,
            borderWidth: borderWidth.m,
            borderColor: color.primary._500,
        },
        smallText: { color: color.text._400, marginLeft: spacing.l },
        smallTextChat: { color: color.text._400, marginLeft: spacing.sm },

        editButton: {
            paddingHorizontal: spacing.m,
            justifyContent: 'center',
        },
    })
}
