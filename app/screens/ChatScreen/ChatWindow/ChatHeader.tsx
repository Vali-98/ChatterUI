import React from 'react'
import { View } from 'react-native'
import { useShallow } from 'zustand/react/shallow'

import { useInputHeightStore } from '../ChatInput'
/**
 * Used to match top of chat to input height
 * @returns ChatHeader component
 */
const ChatHeader = () => {
    const chatInputHeight = useInputHeightStore(useShallow((state) => state.height))
    return (
        <View
            style={{
                paddingTop: chatInputHeight,
            }}
        />
    )
}

export default ChatHeader
