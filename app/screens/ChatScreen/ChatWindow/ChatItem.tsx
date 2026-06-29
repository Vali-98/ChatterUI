import { StyleSheet, View } from 'react-native'

import { useInference } from '@lib/state/Chat'

import ChatBubble from './ChatBubble'
import ChatFrame from './ChatFrame'

type ChatItemProps = {
    index: number
    isLastMessage: boolean
    isGreeting: boolean
    /** Passed down from ChatWindow when a Live2D model is active */
    vnMode?: boolean
}

const ChatItem: React.FC<ChatItemProps> = ({ index, isLastMessage, isGreeting, vnMode = false }) => {
    const nowGenerating = useInference((state) => state.nowGenerating)
    return (
        <View style={[styles.chatItem, vnMode && styles.chatItemVN, { zIndex: index }]}>
            <ChatFrame index={index} nowGenerating={nowGenerating} isLast={isLastMessage}>
                <ChatBubble
                    nowGenerating={nowGenerating}
                    index={index}
                    isLastMessage={isLastMessage}
                    isGreeting={isGreeting}
                    vnMode={vnMode}
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
    chatItemVN: {
        paddingHorizontal: 0,
        marginBottom: 2,
    },
})
