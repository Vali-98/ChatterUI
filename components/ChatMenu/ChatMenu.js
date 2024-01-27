import { View } from 'react-native'

import { ChatWindow } from './ChatWindow/ChatWindow'

// TODO: Move all generation logic here

const ChatMenu = ({ messages }) => {
    return (
        <View style={{ flex: 1 }}>
            <ChatWindow messages={messages} />
        </View>
    )
}

export default ChatMenu
