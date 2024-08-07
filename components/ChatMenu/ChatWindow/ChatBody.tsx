import { View, TouchableOpacity, StyleSheet } from 'react-native'
import { useShallow } from 'zustand/react/shallow'
import Swipes from './Swipes'
import { useState } from 'react'
import { Chats, Style } from '@globals'
import React from 'react'
import Editor from './Editor'
import ChatText from './ChatText'

type ChatTextProps = {
    id: number
    nowGenerating: boolean
    messagesLength: number
}

const ChatBody: React.FC<ChatTextProps> = ({ id, nowGenerating, messagesLength }) => {
    const isLastMessage = id === messagesLength - 1
    const isGreeting = messagesLength === 1
    const { message } = Chats.useChat(
        useShallow((state) => ({
            message: state?.data?.messages?.[id] ?? Chats.dummyEntry,
        }))
    )
    const [editMode, setEditMode] = useState(false)

    const handleEnableEdit = () => {
        setEditMode(!nowGenerating)
    }

    const showEditor = editMode && !nowGenerating
    const showEllipsis = !message.is_user && isLastMessage && nowGenerating

    const isNewChat = messagesLength === 1
    const hasSwipes = message?.swipes?.length > 1
    const showSwipe = !message.is_user && isLastMessage && (hasSwipes || !isNewChat) && !showEditor

    return (
        <View>
            {showEditor && (
                <Editor id={id} isLastMessage={isLastMessage} setEditMode={setEditMode} />
            )}

            {!showEditor && (
                <TouchableOpacity
                    style={styles.messageTextContainer}
                    activeOpacity={0.7}
                    onLongPress={handleEnableEdit}>
                    <ChatText
                        showEllipsis={showEllipsis}
                        nowGenerating={nowGenerating}
                        id={id}
                        isLastMessage={isLastMessage}
                    />
                </TouchableOpacity>
            )}
            {!showEditor && showSwipe && (
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
