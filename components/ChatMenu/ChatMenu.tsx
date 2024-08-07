import { View } from 'react-native'

import { ChatWindow } from './ChatWindow/ChatWindow'

// TODO: Move all generation logic here

const ChatMenu = () => {
    return (
        <View style={{ flex: 1 }}>
            <ChatWindow />
        </View>
    )
}

export default ChatMenu
