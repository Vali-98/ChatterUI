import { Chats, Style } from '@lib/utils/Global'
import React, { useState } from 'react'
import { StyleSheet, TouchableOpacity, View } from 'react-native'

import ChatText from './ChatText'
import ChatTextLast from './ChatTextLast'
import EditorModal from './EditorModal'
import Swipes from './Swipes'

type ChatTextProps = {
    index: number
    nowGenerating: boolean
    isLastMessage: boolean
    isGreeting: boolean
}

const ChatBody: React.FC<ChatTextProps> = ({ index, nowGenerating, isLastMessage, isGreeting }) => {
    const message = Chats.useEntryData(index)
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
                    index={index}
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
                    <ChatTextLast nowGenerating={nowGenerating} index={index} />
                ) : (
                    <ChatText nowGenerating={nowGenerating} index={index} />
                )}
            </TouchableOpacity>

            {showSwipe && (
                <Swipes index={index} nowGenerating={nowGenerating} isGreeting={isGreeting} />
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
