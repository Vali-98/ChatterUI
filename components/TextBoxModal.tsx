import { FontAwesome } from '@expo/vector-icons'
import { Style } from '@globals'
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
import { getStringAsync } from 'expo-clipboard'

type TextBoxModalProps = {
    booleans: [boolean, (b: boolean) => void]
    onConfirm: (text: string) => void
    title?: string
    showPaste?: boolean
}

const TextBoxModal: React.FC<TextBoxModalProps> = ({
    booleans: [showModal, setShowModal],
    onConfirm = (text) => {},
    title = 'Enter Name',
    showPaste = false,
}) => {
    const [text, setText] = useState('')

    useEffect(() => {
        setText('')
    }, [showModal])

    const handleOverlayClick = (e: GestureResponderEvent) => {
        if (e.target === e.currentTarget) setShowModal(false)
    }
    return (
        <Modal
            visible={showModal}
            onRequestClose={() => {
                setShowModal(false)
            }}
            transparent
            statusBarTranslucent={Platform.OS === 'android'}
            animationType="fade"
            onDismiss={() => {
                setShowModal(false)
            }}>
            <TouchableOpacity
                activeOpacity={1}
                onPress={handleOverlayClick}
                style={{
                    backgroundColor: 'rgba(0, 0, 0, 0.5)',
                    flex: 1,
                    justifyContent: 'center',
                }}>
                <View style={styles.modalview}>
                    <Text style={styles.title}>{title}</Text>
                    <View style={styles.inputContainer}>
                        <TextInput style={styles.input} value={text} onChangeText={setText} />
                        {showPaste && (
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

                    <View style={styles.buttonContainer}>
                        <TouchableOpacity
                            style={styles.cancelButton}
                            onPress={() => setShowModal(false)}>
                            <Text style={{ color: Style.getColor('primary-text1') }}>Cancel</Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                            style={styles.confirmButton}
                            onPress={() => {
                                onConfirm(text)
                                setShowModal(false)
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
        backgroundColor: Style.getColor('primary-surface1'),
        borderRadius: 20,
        padding: 35,
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
        borderColor: Style.getColor('primary-surface4'),
        borderWidth: 1,
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
})
