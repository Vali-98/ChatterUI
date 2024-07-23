import AnimatedView from '@components/AnimatedView'
import { useInference } from 'app/constants/Chat'
import { View, StyleSheet } from 'react-native'

import ChatBody from './ChatBody'
import ChatFrame from './ChatFrame'

type ChatItemProps = {
    id: number
    charId: number
    messagesLength: number
}

const ChatItem: React.FC<ChatItemProps> = ({ id, charId, messagesLength }) => {
    const isLastMessage = id === messagesLength - 1
    const nowGenerating = useInference((state) => state.nowGenerating)

    return (
        <AnimatedView dy={100} fade={0} fduration={200} tduration={400}>
            <View
                style={{
                    ...styles.chatItem,
                }}>
                <ChatFrame
                    charId={charId}
                    id={id}
                    nowGenerating={nowGenerating}
                    isLast={isLastMessage}>
                    <ChatBody
                        nowGenerating={nowGenerating}
                        id={id}
                        messagesLength={messagesLength}
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
