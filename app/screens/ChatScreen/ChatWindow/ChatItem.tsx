import { StyleSheet } from 'react-native'
import Animated, { FadeIn, FadeOut, LinearTransition } from 'react-native-reanimated'

import { useLiveQueryJoined } from '@lib/hooks/LiveQueryJoined'
import { useQueuedLiveQuery } from '@lib/hooks/LiveQueryQueued'
import { Chats, useInference } from '@lib/state/Chat'

import ChatBubble from './ChatBubble'
import ChatFrame from './ChatFrame'

type ChatItemProps = {
    index: number
    entryId: number
    isLastMessage: boolean
    isGreeting: boolean
}

type ChatItemBodyProps = ChatItemProps & { entrySwipeIds: number[] }

const ChatItem: React.FC<ChatItemProps> = ({ entryId, ...rest }) => {
    const { data: swipeidList } = useLiveQueryJoined(
        Chats.db.live.swipeIdList(entryId),
        [entryId],
        { deepCheck: true, sync: true }
    )

    return (
        <ChatItemBody
            {...rest}
            entryId={entryId}
            entrySwipeIds={swipeidList.map((item) => item.id)}
        />
    )
}

const ChatItemBody: React.FC<ChatItemBodyProps> = ({
    index,
    isLastMessage,
    isGreeting,
    entryId,
    entrySwipeIds,
    ...rest
}) => {
    const nowGenerating = useInference((state) => state.nowGenerating)
    const { data: entry } = useQueuedLiveQuery(Chats.db.live.entry(entryId), [entryId], {
        targets: [
            { tableName: 'chat_entries', rowId: entryId },
            {
                tableName: 'chat_swipes',
                rowId: entrySwipeIds,
            },
        ],
        sync: true,
    })

    if (!entry || entrySwipeIds.length === 0) return // this should never be hit

    return (
        <Animated.View
            {...rest}
            layout={LinearTransition.duration(250).springify().mass(0.3).damping(20).stiffness(300)}
            exiting={FadeOut.duration(150)}
            entering={FadeIn.duration(250)}
            style={[
                styles.chatItem,
                {
                    zIndex: index,
                    paddingBottom: index === 0 ? 4 : 0,
                    flexDirection: 'column-reverse',
                },
            ]}>
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
        </Animated.View>
    )
}

export default ChatItem

const styles = StyleSheet.create({
    chatItem: {
        paddingHorizontal: 4,
        transform: [{ scale: -1 }],
    },
})
