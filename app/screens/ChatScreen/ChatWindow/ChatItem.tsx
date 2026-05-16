import { StyleSheet } from 'react-native'
import Animated, { FadeIn, FadeOut, LinearTransition } from 'react-native-reanimated'

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

    if (!entry) return

    return (
        <>
            {entry ? (
                <Animated.View
                    layout={LinearTransition.duration(250)
                        .springify()
                        .mass(0.3)
                        .damping(20)
                        .stiffness(300)}
                    exiting={FadeOut.duration(150)}
                    entering={FadeIn.duration(250)}
                    style={[
                        styles.chatItem,
                        { zIndex: index, paddingBottom: index === 0 ? 4 : 0 },
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
            ) : (
                <ChatFrameSkeleton
                    isLastMessage={isLastMessage}
                    index={index}
                    estimatedHeight={Math.max(48, (tokenLength / 10) * 16 + 32)}
                />
            )}
        </>
    )
}

export default ChatItem

const styles = StyleSheet.create({
    chatItem: {
        paddingHorizontal: 4,
        transform: [{ rotate: '180deg' }],
    },
})
