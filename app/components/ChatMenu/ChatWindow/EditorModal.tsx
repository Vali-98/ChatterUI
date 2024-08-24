import { MaterialIcons } from '@expo/vector-icons'
import { Chats, Style } from '@globals'
import { ColorId } from 'app/constants/Style'
import { ReactElement, useState } from 'react'
import {
    GestureResponderEvent,
    Modal,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
    TextInput,
} from 'react-native'
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

type FadeScreenProps = {
    handleOverlayClick: (e: GestureResponderEvent) => void
    children: ReactElement
}
const FadeScreen: React.FC<FadeScreenProps> = ({ handleOverlayClick, children }) => {
    return (
        <TouchableOpacity activeOpacity={1} onPress={handleOverlayClick} style={styles.absolute}>
            {children}
        </TouchableOpacity>
    )
}

const EditorModal: React.FC<EditorProps> = ({ id, isLastMessage, setEditMode, editMode }) => {
    const { updateChat, deleteChat } = Chats.useChat(
        useShallow((state) => ({
            updateChat: state.updateEntry,
            deleteChat: state.deleteEntry,
        }))
    )
    const message = Chats.useChat((state) => state?.data?.messages?.[id])

    const [placeholderText, setPlaceholderText] = useState(
        message?.swipes[message?.swipe_id]?.swipe ?? ''
    )

    const handleEditMessage = () => {
        updateChat(id, placeholderText, false)
        setEditMode(false)
    }

    const handleDeleteMessage = () => {
        deleteChat(id)
        setEditMode(false)
    }

    const handleClose = () => {
        setEditMode(false)
    }

    const handleOverlayClick = (e: GestureResponderEvent) => {
        if (e.target === e.currentTarget) handleClose()
    }

    return (
        <View>
            <Modal
                visible={editMode}
                animationType="fade"
                transparent
                onRequestClose={handleClose}
                style={{ flex: 1 }}>
                <FadeScreen handleOverlayClick={handleOverlayClick}>
                    <View style={styles.editorContainer}>
                        <View style={styles.topText}>
                            <Text style={styles.nameText}>{message?.name}</Text>
                            <Text style={styles.timeText}>
                                {message?.swipes[message.swipe_id].send_date.toLocaleTimeString()}
                            </Text>
                        </View>

                        <TextInput
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
                    </View>
                </FadeScreen>
            </Modal>
        </View>
    )
}

export default EditorModal

const styles = StyleSheet.create({
    absolute: {
        height: '100%',
        justifyContent: 'flex-end',
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
    },

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
