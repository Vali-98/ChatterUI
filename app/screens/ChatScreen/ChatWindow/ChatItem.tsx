import { StyleSheet, View } from 'react-native'

import { useLiveQueryJoined } from '@lib/hooks/LiveQueryJoined'
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
    const { data: entry } = useLiveQueryJoined(Chats.db.live.entry(entryId))
    const swipe = entry?.swipes[0]

    if (!entry || !swipe) return

    return (
        <View style={[styles.chatItem, { zIndex: index, paddingBottom: index === 0 ? 4 : 0 }]}>
            <ChatFrame
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
                />
            </ChatFrame>
        </View>
    )
}

export default ChatItem

const styles = StyleSheet.create({
    chatItem: {
        paddingHorizontal: 4,
    },
})
