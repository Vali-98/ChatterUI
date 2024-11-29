import { FontAwesome } from '@expo/vector-icons'
import { Logger, Style } from 'constants/Global'
import { getStringAsync } from 'expo-clipboard'
import { useState, useEffect } from 'react'
import {
    View,
    Text,
    Modal,
    TextInput,
    StyleSheet,
    TouchableOpacity,
    GestureResponderEvent,
    Platform,
} from 'react-native'

type TextBoxModalProps = {
    booleans: [boolean, (b: boolean) => void]
    onConfirm: (text: string) => void
    onClose?: () => void
    title?: string
    showPaste?: boolean
    placeholder?: string
    textCheck?: (text: string) => boolean
    errorMessage?: string
    autoFocus?: boolean
}

const TextBoxModal: React.FC<TextBoxModalProps> = ({
    booleans: [showModal, setShowModal],
    onConfirm = (text) => {},
    onClose = () => {},
    title = 'Enter Name',
    showPaste = false,
    placeholder = '',
    textCheck = (text: string) => false,
    errorMessage = 'Name cannot be empty',
    autoFocus = false,
}) => {
    const [text, setText] = useState('')
    const [showError, setShowError] = useState(false)

    useEffect(() => {
        setText('')
    }, [showModal])

    const handleOverlayClick = (e: GestureResponderEvent) => {
        if (e.target === e.currentTarget) handleClose()
    }

    const handleClose = () => {
        setShowModal(false)
        setShowError(false)
        onClose()
    }

    return (
        <Modal
            visible={showModal}
            style={{ flex: 1 }}
            transparent
            onRequestClose={handleClose}
            animationType="fade">
            <TouchableOpacity
                activeOpacity={1}
                onPress={handleOverlayClick}
                style={{
                    flex: 1,
                    backgroundColor: 'rgba(0, 0, 0, 0.5)',
                    justifyContent: 'center',
                }}>
                <View style={styles.modalview}>
                    <Text style={styles.title}>{title}</Text>
                    <View style={styles.inputContainer}>
                        <TextInput
                            autoFocus={autoFocus}
                            style={styles.input}
                            value={text}
                            onChangeText={setText}
                            placeholder={placeholder}
                            placeholderTextColor={Style.getColor('primary-text3')}
                        />
                        {showPaste && !text && (
                            <TouchableOpacity
                                style={styles.inputButton}
                                onPress={async () => {
                                    setText(await getStringAsync())
                                }}>
                                <FontAwesome
                                    name="paste"
                                    size={24}
                                    color={Style.getColor('primary-text1')}
                                />
                            </TouchableOpacity>
                        )}
                    </View>
                    {showError && <Text style={styles.errorMessage}>{errorMessage}</Text>}
                    <View style={styles.buttonContainer}>
                        <TouchableOpacity style={styles.cancelButton} onPress={() => handleClose()}>
                            <Text style={{ color: Style.getColor('primary-text1') }}>Cancel</Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                            style={styles.confirmButton}
                            onPress={() => {
                                if (textCheck(text)) {
                                    setShowError(true)
                                    return
                                }
                                onConfirm(text)
                                handleClose()
                            }}>
                            <Text style={{ color: Style.getColor('primary-text1') }}>Confirm</Text>
                        </TouchableOpacity>
                    </View>
                </View>
            </TouchableOpacity>
        </Modal>
    )
}

export default TextBoxModal

const styles = StyleSheet.create({
    title: {
        color: Style.getColor('primary-text1'),
        marginBottom: 16,
    },

    modalview: {
        margin: 20,
        backgroundColor: Style.getColor('primary-surface2'),
        borderRadius: 20,
        paddingHorizontal: 32,
        paddingTop: 30,
        paddingBottom: 20,
        alignItems: 'center',
        shadowColor: '#000',
        shadowOffset: {
            width: 0,
            height: 2,
        },
        shadowOpacity: 0.25,
        shadowRadius: 4,
        elevation: 5,
    },

    buttonContainer: {
        paddingTop: 8,
        flexDirection: 'row',
        alignItems: 'center',
    },

    confirmButton: {
        backgroundColor: Style.getColor('primary-surface4'),
        paddingHorizontal: 24,
        paddingVertical: 12,
        borderRadius: 8,
    },

    cancelButton: {
        marginLeft: 70,
        marginRight: 20,
        borderColor: Style.getColor('primary-surface4'),
        borderWidth: 1,
        paddingHorizontal: 24,
        paddingVertical: 12,
        borderRadius: 8,
    },

    inputContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: Style.getColor('primary-surface1'),
        borderRadius: 8,
        marginBottom: 8,
    },

    input: {
        color: Style.getColor('primary-text1'),
        backgroundColor: Style.getColor('primary-surface1'),
        flex: 1,
        borderRadius: 8,
        paddingHorizontal: 8,
        paddingVertical: 2,
        margin: 8,
    },

    inputButton: {
        marginLeft: 12,
    },

    errorMessage: {
        color: Style.getColor('destructive-brand'),
        marginBottom: 8,
    },
})
