import ThemedButton from '@components/buttons/ThemedButton'
import FadeBackrop from '@components/views/FadeBackdrop'
import { Chats } from '@lib/state/Chat'
import { Theme } from '@lib/theme/ThemeManager'
import React, { useState } from 'react'
import { GestureResponderEvent, Modal, StyleSheet, Text, TextInput, View } from 'react-native'
import Animated, { SlideOutDown } from 'react-native-reanimated'

type EditorProps = {
    index: number
    isLastMessage: boolean
    setEditMode: React.Dispatch<React.SetStateAction<boolean>>
    editMode: boolean
}

const EditorModal: React.FC<EditorProps> = ({ index, isLastMessage, setEditMode, editMode }) => {
    const styles = useStyles()

    const { updateEntry, deleteEntry } = Chats.useEntry()
    const { swipeText, swipe } = Chats.useSwipeData(index)
    const entry = Chats.useEntryData(index)

    const [placeholderText, setPlaceholderText] = useState(swipeText)

    const handleEditMessage = () => {
        updateEntry(index, placeholderText, false)
        setEditMode(false)
    }

    const handleDeleteMessage = () => {
        deleteEntry(index)
        setEditMode(false)
    }

    const handleClose = () => {
        setEditMode(false)
    }

    const handleOverlayClick = (e: GestureResponderEvent) => {
        if (e.target === e.currentTarget) handleClose()
    }

    const inputRef = React.createRef<TextInput>()

    const handleAutoFocus = () => {
        setTimeout(() => {
            inputRef.current?.focus()
            inputRef.current?.setSelection(placeholderText.length, placeholderText.length)
        }, 1)
    }

    return (
        <View>
            <Modal
                visible={editMode}
                animationType="fade"
                transparent
                onShow={handleAutoFocus}
                onRequestClose={handleClose}
                style={{ flex: 1 }}>
                <FadeBackrop handleOverlayClick={handleOverlayClick} />
                <View style={{ flex: 1 }} />
                <Animated.View exiting={SlideOutDown.duration(100)} style={styles.editorContainer}>
                    <View style={styles.topText}>
                        <Text style={styles.nameText}>{entry?.name}</Text>
                        <Text style={styles.timeText}>{swipe?.send_date.toLocaleTimeString()}</Text>
                    </View>

                    <TextInput
                        ref={inputRef}
                        style={styles.messageInput}
                        value={placeholderText}
                        onChangeText={setPlaceholderText}
                        textBreakStrategy="simple"
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
                            label="Confirm"
                            iconName="check"
                            onPress={handleEditMessage}
                            variant="secondary"
                        />
                    </View>
                </Animated.View>
            </Modal>
        </View>
    )
}

export default EditorModal

const useStyles = () => {
    const { color, spacing, borderRadius, fontSize } = Theme.useTheme()
    return StyleSheet.create({
        editorContainer: {
            backgroundColor: color.neutral._100,
            flexShrink: 1,
            paddingTop: spacing.xl,
            paddingBottom: spacing.l,
            paddingHorizontal: spacing.xl,
            borderTopRightRadius: borderRadius.l,
            borderTopLeftRadius: borderRadius.l,
            rowGap: 12,
        },

        topText: {
            flexDirection: 'row',
            alignItems: 'flex-end',
            shadowColor: color.shadow,
            borderTopRightRadius: spacing.m,
            borderTopLeftRadius: spacing.m,
        },

        nameText: {
            color: color.text._100,
            fontSize: fontSize.l,
            marginLeft: spacing.l,
        },

        timeText: {
            color: color.text._400,
            fontSize: fontSize.s,
            marginLeft: spacing.m,
        },

        messageInput: {
            color: color.text._100,
            borderColor: color.neutral._400,
            borderRadius: 8,
            borderWidth: 1,
            padding: 8,
            flexShrink: 1,
        },
    })
}
