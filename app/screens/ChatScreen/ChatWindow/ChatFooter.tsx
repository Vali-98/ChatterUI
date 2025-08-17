import { Chats } from '@lib/state/Chat'
import { Theme } from '@lib/theme/ThemeManager'
import { Text, View } from 'react-native'

const ChatFooter = () => {
    const { chatLength } = Chats.useChat()
    const { color, fontSize } = Theme.useTheme()

    return (
        <View>
            <Text
                style={{
                    color: color.text._700,
                    textAlign: 'center',
                    fontSize: fontSize.s,
                }}>
                Start of chat
            </Text>
            {chatLength !== undefined && chatLength <= 1 && (
                <Text
                    style={{
                        color: color.text._700,
                        textAlign: 'center',
                        fontSize: fontSize.s,
                    }}>
                    Send a message to begin!
                </Text>
            )}
        </View>
    )
}

export default ChatFooter
