import { useUnfocusTextInput } from '@lib/hooks/UnfocusTextInput'
import { Theme } from '@lib/theme/ThemeManager'
import { useRef } from 'react'
import { View, Text, StyleSheet, TextInput, TextInputProps, ViewStyle } from 'react-native'

interface ThemedTextInputProps extends TextInputProps {
    label?: string
    description?: string
    value: string
    containerStyle?: ViewStyle
    autoUnfocus?: boolean
}

const ThemedTextInput: React.FC<ThemedTextInputProps> = ({
    label,
    description,
    numberOfLines,
    multiline = false,
    style = undefined,
    autoUnfocus = true,
    containerStyle = {},
    ...rest
}) => {
    const { color } = Theme.useTheme()
    const ref = useUnfocusTextInput()

    return (
        <View
            style={{
                flex: 1,
                ...containerStyle,
            }}>
            {label && (
                <Text
                    style={{
                        color: color.text._100,
                        marginBottom: 8,
                    }}>
                    {label}
                </Text>
            )}
            <TextInput
                ref={autoUnfocus ? ref : null}
                multiline={(!!numberOfLines && numberOfLines > 1) || multiline}
                numberOfLines={numberOfLines}
                style={[
                    {
                        color: color.text._100,
                        borderColor: color.neutral._400,
                        borderWidth: 1,
                        paddingVertical: 8,
                        paddingHorizontal: 12,
                        borderRadius: 8,
                        textAlignVertical: numberOfLines && numberOfLines > 1 ? `top` : `center`,
                    },
                    style,
                ]}
                placeholder="----"
                placeholderTextColor={color.text._500}
                {...rest}
            />
        </View>
    )
}

export default ThemedTextInput
