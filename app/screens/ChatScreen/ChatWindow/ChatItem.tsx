import { useLiveQuery } from 'drizzle-orm/expo-sqlite'
import { StyleSheet, View } from 'react-native'

import { Chats, useInference } from '@lib/state/Chat'

import ChatBubble from './ChatBubble'
import ChatFrame from './ChatFrame'

type ChatItemProps = {
    index: number
    entryId: number
    isLastMessage: boolean
    isGreeting: boolean
}

const ChatItem: React.FC<ChatItemProps> = ({ index, isLastMessage, isGreeting, entryId }) => {
    const nowGenerating = useInference((state) => state.nowGenerating)
    const { data: entry } = useLiveQuery(Chats.db.live.entry(entryId))
    const { data: swipe } = useLiveQuery(Chats.db.live.activeSwipeByEntry(entryId))
    if (!entry || !swipe) return

    return (
        <View style={[styles.chatItem, { zIndex: index }]}>
            <ChatFrame
                swipe={swipe}
                index={index}
                nowGenerating={nowGenerating}
                isLast={isLastMessage}
                entry={entry}>
                <ChatBubble
                    nowGenerating={nowGenerating}
                    entry={entry}
                    index={index}
                    isLastMessage={isLastMessage}
                    isGreeting={isGreeting}
                    swipe={swipe}
                />
            </ChatFrame>
        </View>
    )
}

export default ChatItem

const styles = StyleSheet.create({
    chatItem: {
        paddingHorizontal: 4,
        marginBottom: 4,
    },
})
