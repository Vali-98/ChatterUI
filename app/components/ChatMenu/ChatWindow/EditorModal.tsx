import FadeBackrop from '@components/FadeBackdrop'
import { MaterialIcons } from '@expo/vector-icons'
import { Chats, Style } from 'constants/Global'
import { ColorId } from 'constants/Style'
import React, { useState } from 'react'
import {
    GestureResponderEvent,
    Modal,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from 'react-native'
import Animated, { SlideOutDown } from 'react-native-reanimated'
import { useShallow } from 'zustand/react/shallow'

type EditorButtonProps = {
    name: 'delete' | 'check' | 'close'
    color: ColorId
    label: string
    onPress: () => void
}

const EditorButton = ({ name, onPress, label, color }: EditorButtonProps) => (
    <TouchableOpacity style={styles.editButton} onPress={onPress}>
        <MaterialIcons
            name={name}
            size={name === 'delete' ? 20 : 24}
            color={Style.getColor(color)}
        />
        <Text
            style={{
                color: Style.getColor('primary-text2'),
                paddingLeft: 8,
            }}>
            {label}
        </Text>
    </TouchableOpacity>
)

type EditorProps = {
    id: number
    isLastMessage: boolean
    setEditMode: React.Dispatch<React.SetStateAction<boolean>>
    editMode: boolean
}

const EditorModal: React.FC<EditorProps> = ({ id, isLastMessage, setEditMode, editMode }) => {
    const { updateEntry, deleteEntry } = Chats.useEntry()
    const { swipeText, swipe } = Chats.useSwipeData(id)
    const entry = Chats.useEntryData(id)

    const [placeholderText, setPlaceholderText] = useState(swipeText)

    const handleEditMessage = () => {
        updateEntry(id, placeholderText, false)
        setEditMode(false)
    }

    const handleDeleteMessage = () => {
        deleteEntry(id)
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
                        <Text style={styles.timeText}>{swipe.send_date.toLocaleTimeString()}</Text>
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
                            marginTop: 8,
                        }}>
                        <EditorButton
                            name="delete"
                            label="Delete"
                            onPress={handleDeleteMessage}
                            color="destructive-brand"
                        />

                        <EditorButton
                            name="check"
                            label="Confirm"
                            onPress={handleEditMessage}
                            color="primary-text1"
                        />
                    </View>
                </Animated.View>
            </Modal>
        </View>
    )
}

export default EditorModal

const styles = StyleSheet.create({
    editorContainer: {
        backgroundColor: Style.getColor('primary-surface2'),
        flexShrink: 1,
        paddingVertical: 12,
        paddingHorizontal: 16,
        borderTopRightRadius: 24,
        borderTopLeftRadius: 24,
    },

    topText: {
        flexDirection: 'row',
        paddingTop: 12,
        marginBottom: 8,
        alignItems: 'flex-end',
        shadowColor: Style.getColor('primary-shadow'),
        borderTopRightRadius: 8,
        borderTopLeftRadius: 8,
    },

    nameText: {
        color: Style.getColor('primary-text1'),
        fontSize: 18,
        marginLeft: 24,
    },

    timeText: {
        color: Style.getColor('primary-text2'),
        fontSize: 12,
        marginLeft: 8,
    },

    editButton: {
        flexDirection: 'row',
        alignItems: 'center',
        width: 108,
        height: 33,
        paddingLeft: 12,
        paddingVertical: 4,
        borderRadius: 8,
        borderWidth: 1,
        borderColor: Style.getColor('primary-surface4'),
    },

    messageInput: {
        color: Style.getColor('primary-text1'),
        backgroundColor: Style.getColor('primary-surface1'),
        borderColor: Style.getColor('primary-brand'),
        borderRadius: 8,
        borderWidth: 1,
        padding: 8,
        flexShrink: 1,
    },
})
