import FadeDownView from '@components/views/FadeDownView'
import { useInference } from '@lib/state/Chat'
import { View, StyleSheet } from 'react-native'

import ChatBody from './ChatBody'
import ChatFrame from './ChatFrame'

type ChatItemProps = {
    index: number
    isLastMessage: boolean
    isGreeting: boolean
}

const ChatItem: React.FC<ChatItemProps> = ({ index, isLastMessage, isGreeting }) => {
    const nowGenerating = useInference((state) => state.nowGenerating)

    return (
        <View style={styles.chatItem}>
            <ChatFrame index={index} nowGenerating={nowGenerating} isLast={isLastMessage}>
                <ChatBody
                    nowGenerating={nowGenerating}
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
        flexDirection: 'row',
        alignItems: 'flex-start',
        paddingVertical: 12,
        paddingHorizontal: 8,
    },
})
