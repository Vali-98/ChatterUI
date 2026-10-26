import { StyleSheet } from 'react-native'
import Animated, { FadeIn, FadeOut, LinearTransition } from 'react-native-reanimated'

import { useChatGenerating } from '@lib/engine/generation/hooks'
import { useLiveQuerySync } from '@lib/hooks/liveQuery'
import { Chats } from '@lib/state/chat'

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
    const { data: swipeidList } = useLiveQuerySync(Chats.db.live.swipeIds(entryId), {
        key: ['entry-swipe-ids', entryId],
        watch: [{ table: 'chat_swipes' }, { table: 'swipe_reasoning' }],
    })

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
    const { data: entry } = useLiveQuerySync(Chats.db.live.message(entryId), {
        key: ['chat-entry', entryId],
        watch: [
            { table: 'chat_entries', rowId: entryId },
            { table: 'chat_swipes', rowId: entrySwipeIds },
            { table: 'swipe_reasoning', rowId: entrySwipeIds },
            { table: 'chat_attachment' },
        ],
    })

    const isGenerating = useChatGenerating(entry?.chat_id)

    if (!entry || entry.swipes.length === 0) return // this should never be hit

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
                isGenerating={isGenerating}
                isLast={isLastMessage}
                entry={entry}>
                <ChatBubble
                    isGenerating={isGenerating}
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
