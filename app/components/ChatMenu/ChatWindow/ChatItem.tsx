import FadeDownView from '@components/FadeDownView'
import { useInference } from 'constants/Chat'
import { View, StyleSheet } from 'react-native'

import ChatBody from './ChatBody'
import ChatFrame from './ChatFrame'

type ChatItemProps = {
    id: number
    isLastMessage: boolean
    isGreeting: boolean
}

const ChatItem: React.FC<ChatItemProps> = ({ id, isLastMessage, isGreeting }) => {
    const nowGenerating = useInference((state) => state.nowGenerating)

    return (
        <FadeDownView>
            <View style={styles.chatItem}>
                <ChatFrame id={id} nowGenerating={nowGenerating} isLast={isLastMessage}>
                    <ChatBody
                        nowGenerating={nowGenerating}
                        id={id}
                        isLastMessage={isLastMessage}
                        isGreeting={isGreeting}
                    />
                </ChatFrame>
            </View>
        </FadeDownView>
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
