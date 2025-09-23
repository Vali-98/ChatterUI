import { useInference } from '@lib/state/Chat'
import { StyleSheet } from 'react-native'

import Animated, { FadeIn, FadeOut } from 'react-native-reanimated'
import ChatBubble from './ChatBubble'
import ChatFrame from './ChatFrame'

type ChatItemProps = {
    index: number
    isLastMessage: boolean
    isGreeting: boolean
}

const ChatItem: React.FC<ChatItemProps> = ({ index, isLastMessage, isGreeting }) => {
    const nowGenerating = useInference((state) => state.nowGenerating)
    return (
        <Animated.View
            style={[styles.chatItem, { zIndex: index }]}
            entering={FadeIn.duration(150).delay(100)}
            exiting={FadeOut.duration(250)}>
            <ChatFrame index={index} nowGenerating={nowGenerating} isLast={isLastMessage}>
                <ChatBubble
                    nowGenerating={nowGenerating}
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
        paddingHorizontal: 8,
    },
})
