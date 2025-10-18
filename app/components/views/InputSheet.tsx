import ThemedButton from '@components/buttons/ThemedButton'
import ThemedTextInput from '@components/input/ThemedTextInput'
import { Theme } from '@lib/theme/ThemeManager'
import React, { useState } from 'react'
import { Text, View } from 'react-native'
import BottomSheet from './BottomSheet'

export type InputSheetProps = {
    visible: boolean
    setVisible: (visible: boolean) => void
    onConfirm: (text: string) => void
    onClose?: () => void
    title?: string
    description?: string
    placeholder?: string
    verifyText?: (text: string) => string
    errorMessage?: string
    autoFocus?: boolean
    defaultValue?: string
    multiline?: boolean
}

const InputSheet: React.FC<InputSheetProps> = ({
    visible,
    setVisible,
    onConfirm = (text) => {},
    onClose = () => {},
    title = '',
    description = '',
    placeholder = '',
    verifyText = (text: string) => '',
    autoFocus = false,
    defaultValue = '',
    multiline = false,
}) => {
    const [text, setText] = useState(defaultValue)
    const [errorMessage, setErrorMessage] = useState('')
    const { color, fontSize, spacing } = Theme.useTheme()

    const handleClose = () => {
        setVisible(false)
        onClose()
        setErrorMessage('')
    }

    return (
        <BottomSheet visible={visible} setVisible={setVisible} onClose={handleClose}>
            <View style={{ rowGap: spacing.xl }}>
                {title && (
                    <Text
                        style={{
                            color: color.text._100,
                            fontSize: fontSize.xl,
                        }}>
                        {title}
                    </Text>
                )}
                {description && (
                    <Text
                        style={{
                            color: color.text._400,
                        }}>
                        {description}
                    </Text>
                )}

                <View style={{ flexDirection: 'row', columnGap: spacing.m }}>
                    <ThemedTextInput
                        multiline={multiline}
                        autoFocus={autoFocus}
                        placeholder={placeholder}
                        defaultValue={defaultValue}
                        value={text}
                        onChangeText={setText}
                        containerStyle={{ flex: 1 }}
                        numberOfLines={10}
                    />
                </View>
                {errorMessage && <Text style={{ color: color.error._300 }}>{errorMessage}</Text>}

                <View
                    style={{
                        flexDirection: 'row',
                        justifyContent: 'space-between',
                    }}>
                    <ThemedButton label="Cancel" variant="secondary" onPress={handleClose} />
                    <View
                        style={{
                            flexDirection: 'row',
                            columnGap: spacing.xl,
                            justifyContent: 'flex-end',
                        }}>
                        <ThemedButton
                            iconStyle={{ color: color.text._400 }}
                            iconName="close"
                            variant="tertiary"
                            onPress={() => setText('')}
                        />
                        <ThemedButton
                            iconStyle={{ color: color.text._400 }}
                            iconName="copy1"
                            variant="tertiary"
                        />
                    </View>
                    <ThemedButton
                        label="Confirm"
                        onPress={() => {
                            const result = verifyText(text)
                            if (result) setErrorMessage(result)
                            else {
                                onConfirm(text)
                                handleClose()
                            }
                        }}
                    />
                </View>
            </View>
        </BottomSheet>
    )
}

export default InputSheet
