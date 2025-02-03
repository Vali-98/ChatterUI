import { Theme } from '@lib/theme/ThemeManager'
import { View, Text, StyleSheet, TextInput, TextInputProps } from 'react-native'

interface ThemedTextInputProps extends TextInputProps {
    label?: string
    description?: string
    value: string
}
// TODO: Delete this?
const ThemedTextInput: React.FC<ThemedTextInputProps> = ({
    label,
    description,
    numberOfLines,
    multiline = false,
    style = undefined,
    ...rest
}) => {
    const { color } = Theme.useTheme()
    return (
        <View
            style={{
                flex: 1,
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
                placeholderTextColor={color.text._400}
                {...rest}
            />
        </View>
    )
}

export default ThemedTextInput
