import { Theme } from '@lib/theme/ThemeManager'
import { Chats } from '@lib/utils/Global'
import React, { useState } from 'react'
import { TouchableOpacity, View } from 'react-native'

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
    const { color, spacing, borderRadius } = Theme.useTheme()
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
                style={{
                    backgroundColor: color.neutral._200,
                    borderColor: color.neutral._200,
                    borderWidth: 1,
                    paddingVertical: spacing.sm,
                    paddingHorizontal: spacing.m,
                    minHeight: 40,
                    borderRadius: borderRadius.m,
                    shadowColor: color.shadow,
                    elevation: 2,
                }}
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
