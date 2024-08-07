import AnimatedView from '@components/AnimatedView'
import { View, StyleSheet } from 'react-native'

import ChatBody from './ChatBody'
import ChatFrame from './ChatFrame'

type ChatItemProps = {
    id: number
    nowGenerating: boolean
    charId: number
    userName: string
    TTSenabled: boolean
    messagesLength: number
}

const ChatItem: React.FC<ChatItemProps> = ({
    id,
    nowGenerating,
    charId,
    userName,
    TTSenabled,
    messagesLength,
}) => {
    const isLastMessage = id === messagesLength - 1
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
                    isLast={isLastMessage}
                    TTSenabled={TTSenabled}>
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
