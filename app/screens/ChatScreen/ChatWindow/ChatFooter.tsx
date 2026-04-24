import { Text, View } from 'react-native'

import { Chats } from '@lib/state/Chat'
import { Theme } from '@lib/theme/ThemeManager'

const ChatFooter = () => {
    const { chatLength } = Chats.useChat()
    const { color, fontSize } = Theme.useTheme()

    return (
        <View
            style={{
                paddingBottom: 8,
                flex: 1,
                justifyContent: 'center',
                flexDirection: 'row',
            }}>
            <View
                style={{
                    backgroundColor: color.neutral._100 + '22',
                    borderRadius: 8,
                    paddingHorizontal: 12,
                    paddingVertical: 4,
                    marginBottom: 12,
                }}>
                <Text
                    style={{
                        color: color.text._700,
                        textAlign: 'center',
                        fontSize: fontSize.s,
                    }}>
                    {chatLength !== undefined && chatLength <= 1
                        ? 'Send a message to begin!'
                        : 'Start of chat'}
                </Text>
            </View>
        </View>
    )
}

export default ChatFooter
