import React from 'react'
import { View } from 'react-native'

import { useChatControlLayoutState } from '@lib/state/components/ChatControls'
// The inverted list's header provides space below the latest message for floating controls.
const ChatHeader = () => {
    const chatInputHeight = useChatControlLayoutState((state) => state.inputHeight)
    return (
        <View
            style={{
                paddingTop: chatInputHeight,
            }}
        />
    )
}

export default ChatHeader
