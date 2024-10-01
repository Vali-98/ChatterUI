import { Chats, Style } from '@globals'
import React, { useState } from 'react'
import { View, TouchableOpacity, StyleSheet } from 'react-native'
import { useShallow } from 'zustand/react/shallow'

import ChatText from './ChatText'
import ChatTextLast from './ChatTextLast'
import EditorModal from './EditorModal'
import Swipes from './Swipes'

type ChatTextProps = {
    id: number
    nowGenerating: boolean
    isLastMessage: boolean
    isGreeting: boolean
}

const ChatBody: React.FC<ChatTextProps> = ({ id, nowGenerating, isLastMessage, isGreeting }) => {
    const { message } = Chats.useChat(
        useShallow((state) => ({
            message: state?.data?.messages?.[id] ?? Chats.dummyEntry,
        }))
    )
    const [editMode, setEditMode] = useState(false)

    const handleEnableEdit = () => {
        setEditMode(!nowGenerating)
    }

    const hasSwipes = message?.swipes?.length > 1
    const showSwipe = !message.is_user && isLastMessage && (hasSwipes || !isGreeting)

    return (
        <View>
            {editMode && (
                <EditorModal
                    id={id}
                    isLastMessage={isLastMessage}
                    setEditMode={setEditMode}
                    editMode={editMode}
                />
            )}

            <TouchableOpacity
                style={styles.messageTextContainer}
                activeOpacity={0.7}
                onLongPress={handleEnableEdit}>
                {isLastMessage ? (
                    <ChatTextLast nowGenerating={nowGenerating} id={id} />
                ) : (
                    <ChatText nowGenerating={nowGenerating} id={id} />
                )}
            </TouchableOpacity>

            {showSwipe && (
                <Swipes index={id} nowGenerating={nowGenerating} isGreeting={isGreeting} />
            )}
        </View>
    )
}

export default ChatBody

const styles = StyleSheet.create({
    messageTextContainer: {
        backgroundColor: Style.getColor('primary-surface3'),
        paddingHorizontal: 8,
        minHeight: 40,
        borderRadius: 8,
        textAlignVertical: 'center',
        shadowColor: Style.getColor('primary-shadow'),
        elevation: 4,
    },
})
