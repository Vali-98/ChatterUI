import MaterialIcons from '@react-native-vector-icons/material-icons/static'
import { StyleSheet, Text, View } from 'react-native'

import { Chats } from '@lib/state/Chat'
import { Theme } from '@lib/theme/ThemeManager'

import ChatEditPopup from './ChatDrawerOptions'

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
        <ChatEditPopup item={item} onPress={() => onLoad(item.id)}>
            <View style={item.id === chatId ? styles.chatItemActive : styles.chatItem}>
                <View
                    style={{ flex: 1, paddingHorizontal: spacing.xs, paddingVertical: spacing.m }}>
                    <Text style={styles.title}>{item.name}</Text>
                    <View
                        style={{
                            flexDirection: 'row',
                            alignItems: 'center',
                            marginTop: spacing.xl,
                            justifyContent: 'space-between',
                        }}>
                        <View style={{ flexDirection: 'row' }}>
                            <MaterialIcons
                                name="chat-bubble-outline"
                                size={20}
                                color={color.text._700}
                            />
                            <Text style={styles.smallTextChat}>{item.entryCount}</Text>
                        </View>
                        <View style={{ flexDirection: 'row' }}>
                            <Text style={styles.smallText}>{date.toLocaleDateString()}</Text>
                            <Text style={styles.smallText}>{date.toLocaleTimeString()}</Text>
                        </View>
                    </View>
                </View>
            </View>
        </ChatEditPopup>
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
        smallText: { color: color.text._700, marginLeft: spacing.l },
        smallTextChat: { color: color.text._600, marginLeft: spacing.sm },

        editButton: {
            paddingHorizontal: spacing.m,
            justifyContent: 'center',
        },
    })
}
