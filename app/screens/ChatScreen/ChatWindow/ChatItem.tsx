import { StyleSheet, View } from 'react-native'

import { useQueuedLiveQuery } from '@lib/hooks/LiveQueryQueued'
import { Chats, useInference } from '@lib/state/Chat'

import ChatBubble from './ChatBubble'
import ChatFrame from './ChatFrame'
import ChatFrameSkeleton from './ChatFrameSkeleton'

type ChatItemProps = {
    index: number
    entryId: number
    isLastMessage: boolean
    isGreeting: boolean
    tokenLength: number
}

const ChatItem: React.FC<ChatItemProps> = ({
    index,
    isLastMessage,
    isGreeting,
    entryId,
    tokenLength,
}) => {
    const nowGenerating = useInference((state) => state.nowGenerating)
    const { data: entry } = useQueuedLiveQuery(Chats.db.live.entry(entryId))

    return (
        <View style={[styles.chatItem, { zIndex: index, paddingBottom: index === 0 ? 4 : 0 }]}>
            {entry ? (
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
            ) : (
                <ChatFrameSkeleton
                    index={index}
                    estimatedHeight={Math.max(48, (tokenLength / 10) * 16 + 32)}
                />
            )}
        </View>
    )
}

export default ChatItem

const styles = StyleSheet.create({
    chatItem: {
        paddingHorizontal: 4,
    },
})
