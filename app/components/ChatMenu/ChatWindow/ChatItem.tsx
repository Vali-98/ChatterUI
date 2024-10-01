import AnimatedView from '@components/AnimatedView'
import { useInference } from 'app/constants/Chat'
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
        <AnimatedView dy={100} fade={0} fduration={200} tduration={400}>
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
        </AnimatedView>
    )
}

export { ChatItem }

const styles = StyleSheet.create({
    chatItem: {
        flexDirection: 'row',
        alignItems: 'flex-start',
        paddingVertical: 12,
        paddingHorizontal: 8,
    },
})
