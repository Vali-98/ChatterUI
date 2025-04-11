import { Ionicons } from '@expo/vector-icons'
import { Chats } from '@lib/state/Chat'
import { Theme } from '@lib/theme/ThemeManager'
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native'

import ChatEditPopup from './ChatEditPopup'

type ListItem = Awaited<ReturnType<typeof Chats.db.query.chatListQuery>>[0]

type ChatDrawerItemProps = {
    item: ListItem
    onLoad: (id: number) => void
}

const ChatDrawerItem: React.FC<ChatDrawerItemProps> = ({ item, onLoad }) => {
    const styles = useStyles()
    const { spacing, color } = Theme.useTheme()
    const date = new Date(item.last_modified ?? 0)
    const { chatId } = Chats.useChat()
    return (
        <View style={item.id === chatId ? styles.chatItemActive : styles.chatItem}>
            <TouchableOpacity
                style={{ flex: 1, paddingHorizontal: spacing.xs, paddingVertical: spacing.m }}
                onPress={() => onLoad(item.id)}>
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
            <ChatEditPopup item={item} />
        </View>
    )
}

export default ChatDrawerItem

const useStyles = () => {
    const { color, spacing, borderWidth, borderRadius, fontSize } = Theme.useTheme()

    return StyleSheet.create({
        title: {
            color: color.text._100,
            fontSize: fontSize.l,
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
