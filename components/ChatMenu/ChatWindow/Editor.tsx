import { View, StyleSheet, TouchableOpacity, TextInput } from 'react-native'
import { useState } from 'react'
import { useShallow } from 'zustand/react/shallow'
import { Chats, Style } from '@globals'
import { MaterialIcons } from '@expo/vector-icons'

type EditorButtonProps = {
    name: 'delete' | 'check' | 'close'
    onPress: () => void
}

const EditorButton = ({ name, onPress }: EditorButtonProps) => (
    <TouchableOpacity style={styles.editButton} onPress={onPress}>
        <MaterialIcons name={name} size={28} color={Style.getColor('primary-text1')} />
    </TouchableOpacity>
)

type EditorProps = {
    id: number
    isLastMessage: boolean
    setEditMode: React.Dispatch<React.SetStateAction<boolean>>
}

const Editor: React.FC<EditorProps> = ({ id, isLastMessage, setEditMode }) => {
    const { updateChat, deleteChat } = Chats.useChat(
        useShallow((state) => ({
            updateChat: state.updateEntry,
            deleteChat: state.deleteEntry,
        }))
    )
    const mes = Chats.useChat(
        (state) =>
            state?.data?.messages?.[id]?.swipes?.[state?.data?.messages?.[id].swipe_id ?? -1]
                .swipe ?? ''
    )

    const [placeholderText, setPlaceholderText] = useState(mes)

    const handleEditMessage = () => {
        updateChat(id, placeholderText, false)
        setEditMode(false)
    }

    const handleDeleteMessage = () => {
        deleteChat(id)
        setEditMode(false)
    }

    const handleDisableEdit = () => {
        setEditMode((editMode) => false)
    }

    return (
        <View>
            <View
                style={{
                    flexDirection: 'row',
                    justifyContent: 'space-between',
                    marginBottom: 2,
                }}>
                {id !== 0 && <EditorButton name="delete" onPress={handleDeleteMessage} />}
                <View
                    style={{
                        flexDirection: 'row',
                        justifyContent: 'space-between',
                    }}>
                    <EditorButton name="check" onPress={handleEditMessage} />
                    <EditorButton name="close" onPress={handleDisableEdit} />
                </View>
            </View>
            <View style={styles.messageInput}>
                <TextInput
                    style={{ color: Style.getColor('primary-text1') }}
                    value={placeholderText}
                    onChangeText={setPlaceholderText}
                    textBreakStrategy="simple"
                    multiline
                    autoFocus
                />
            </View>
        </View>
    )
}

export default Editor

const styles = StyleSheet.create({
    editButton: {
        marginRight: 12,
    },

    messageInput: {
        color: Style.getColor('primary-text1'),
        backgroundColor: Style.getColor('primary-surface1'),
        borderColor: Style.getColor('primary-brand'),
        borderWidth: 1,
        borderRadius: 8,
        padding: 8,
    },
})
