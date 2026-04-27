import { useLiveQuery } from 'drizzle-orm/expo-sqlite'
import React, { useEffect, useState } from 'react'
import { StyleSheet, Text, View } from 'react-native'
import { create } from 'zustand'

import ThemedButton from '@components/buttons/ThemedButton'
import ThemedTextInput from '@components/input/ThemedTextInput'
import BottomSheet from '@components/views/BottomSheet'
import { Chats } from '@lib/state/Chat'
import { Theme } from '@lib/theme/ThemeManager'

type ChatEditorStateProps = {
    entryId: number
    editMode: boolean
    hide: () => void
    show: (index: number) => void
}

//TODO: This is somewhat unsafe, as it always expects index to be valid at 0
export const useChatEditorStore = create<ChatEditorStateProps>()((set) => ({
    entryId: 0,
    editMode: false,
    hide: () => {
        set({ editMode: false })
    },
    show: (index) => {
        set({ editMode: true, entryId: index })
    },
}))

const ChatEditor = () => {
    const { entryId, editMode, hide } = useChatEditorStore()
    const styles = useStyles()
    const { data: entry } = useLiveQuery(Chats.db.live.entry(entryId), [entryId])
    const { data: swipe } = useLiveQuery(Chats.db.live.activeSwipeByEntry(entryId), [entryId])
    const [placeholderText, setPlaceholderText] = useState('')

    const swipeText = swipe?.swipe
    useEffect(() => {
        editMode && setPlaceholderText(swipeText ?? '')
    }, [swipeText, editMode])

    // TODO: This should safely return if invalid values were given
    if (swipe === undefined) return

    const handleEditMessage = () => {
        hide()
        if (placeholderText !== swipeText)
            Chats.db.mutate.updateChatSwipe(swipe.id, placeholderText)
    }

    const handleDeleteMessage = () => {
        hide()
        Chats.db.mutate.deleteChatEntry(entryId)
    }

    const handleClose = () => {
        hide()
    }

    return (
        <BottomSheet
            sheetStyle={{ rowGap: 12 }}
            visible={editMode}
            setVisible={(visible) => {
                if (!visible) handleClose()
            }}
            onClose={handleClose}>
            <View style={styles.topText}>
                <Text numberOfLines={1} style={styles.nameText} ellipsizeMode="tail">
                    {entry?.name}
                </Text>
                <Text style={styles.timeText}>{swipe?.send_date.toLocaleTimeString()}</Text>
            </View>

            <ThemedTextInput
                containerStyle={{ flex: 0, flexShrink: 1 }}
                value={placeholderText}
                onChangeText={setPlaceholderText}
                multiline
            />

            <View
                style={{
                    flexDirection: 'row',
                    justifyContent: 'space-between',
                }}>
                <ThemedButton
                    label="Delete"
                    iconName="delete"
                    onPress={handleDeleteMessage}
                    variant="critical"
                />
                <ThemedButton
                    iconName="reload"
                    variant="tertiary"
                    label="Reset"
                    onPress={() => swipeText && setPlaceholderText(swipeText)}
                />
                <ThemedButton
                    label="Confirm"
                    iconName="check"
                    onPress={handleEditMessage}
                    variant="secondary"
                />
            </View>
        </BottomSheet>
    )
}

export default ChatEditor

const useStyles = () => {
    const { color, spacing, fontSize } = Theme.useTheme()
    return StyleSheet.create({
        topText: {
            flexDirection: 'row',
            alignItems: 'flex-end',
            columnGap: 12,
            shadowColor: color.shadow,
            borderTopRightRadius: spacing.m,
            borderTopLeftRadius: spacing.m,
        },

        nameText: {
            color: color.text._100,
            fontSize: fontSize.l,
        },

        timeText: {
            color: color.text._400,
            fontSize: fontSize.s,
        },

        messageInput: {
            color: color.text._100,
            borderColor: color.neutral._400,
            borderRadius: 8,
            borderWidth: 1,
            padding: 8,
        },
    })
}
