import ThemedButton from '@components/buttons/ThemedButton'
import { FontAwesome } from '@expo/vector-icons'
import { Theme } from '@lib/theme/ThemeManager'
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
    defaultValue?: string
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
    defaultValue = '',
}) => {
    const styles = useStyles()
    const { color, spacing } = Theme.useTheme()
    const [text, setText] = useState(defaultValue)
    const [showError, setShowError] = useState(false)

    useEffect(() => {
        setText(defaultValue)
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
                            placeholderTextColor={color.text._700}
                        />
                        {showPaste && !text && (
                            <TouchableOpacity
                                style={styles.inputButton}
                                onPress={async () => {
                                    setText(await getStringAsync())
                                }}>
                                <FontAwesome name="paste" size={24} color={color.text._100} />
                            </TouchableOpacity>
                        )}
                    </View>
                    {showError && <Text style={styles.errorMessage}>{errorMessage}</Text>}
                    <View style={{ flexDirection: 'row' }}>
                        <View style={styles.buttonContainer}>
                            <ThemedButton
                                label="Cancel"
                                variant="tertiary"
                                onPress={() => handleClose()}
                                buttonStyle={{
                                    paddingVertical: spacing.l,
                                    paddingHorizontal: spacing.xl,
                                }}
                            />
                            <ThemedButton
                                label="Confirm"
                                variant="secondary"
                                onPress={() => {
                                    if (textCheck(text)) {
                                        setShowError(true)
                                        return
                                    }
                                    onConfirm(text)
                                    handleClose()
                                }}
                                buttonStyle={{
                                    paddingVertical: spacing.l,
                                    paddingHorizontal: spacing.xl,
                                }}
                            />
                        </View>
                    </View>
                </View>
            </TouchableOpacity>
        </Modal>
    )
}

export default TextBoxModal

const useStyles = () => {
    const { color, spacing, borderRadius } = Theme.useTheme()
    return StyleSheet.create({
        title: {
            color: color.text._100,
            marginBottom: spacing.xl,
        },

        modalview: {
            margin: spacing.xl,
            backgroundColor: color.neutral._200,
            borderRadius: borderRadius.xl,
            paddingHorizontal: spacing.xl2,
            paddingTop: spacing.xl2,
            paddingBottom: spacing.xl,
            alignItems: 'center',
            shadowColor: '#000',
            shadowOffset: {
                width: 0,
                height: 2,
            },
            shadowOpacity: 0.25,
            shadowRadius: 4,
            elevation: spacing.m,
        },

        buttonContainer: {
            flex: 1,
            columnGap: spacing.xl,
            marginTop: spacing.s,
            flexDirection: 'row',
            justifyContent: 'flex-end',
        },

        confirmButton: {
            backgroundColor: color.neutral._300,
            paddingHorizontal: spacing.xl2,
            paddingVertical: spacing.l,
            borderRadius: borderRadius.m,
        },

        cancelButton: {
            marginLeft: spacing.xl3,
            marginRight: spacing.xl2,
            borderColor: color.neutral._400,
            borderWidth: 1,
            paddingHorizontal: spacing.xl2,
            paddingVertical: spacing.l,
            borderRadius: borderRadius.m,
        },

        inputContainer: {
            flexDirection: 'row',
            alignItems: 'center',
            backgroundColor: color.neutral._100,
            borderRadius: borderRadius.m,
            marginBottom: spacing.m,
        },

        input: {
            color: color.text._100,
            backgroundColor: color.neutral._100,
            flex: 1,
            borderRadius: borderRadius.m,
            paddingHorizontal: spacing.m,
            paddingVertical: spacing.xs,
            margin: spacing.m,
        },

        inputButton: {
            marginLeft: spacing.l,
        },

        errorMessage: {
            color: color.error._300,
            marginBottom: spacing.m,
        },
    })
}
