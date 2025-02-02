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
    ...rest
}) => {
    const { color } = Theme.useTheme()
    return (
        <View
            style={{
                paddingBottom: 8,
                flex: 1,
            }}>
            <Text
                style={{
                    color: color.text._100,
                }}>
                {label}
            </Text>
            <TextInput
                {...rest}
                multiline={(!!numberOfLines && numberOfLines > 1) || multiline}
                numberOfLines={numberOfLines}
                style={{
                    color: color.text._100,
                    borderColor: color.neutral._300,
                    borderWidth: 1,
                    paddingVertical: 4,
                    paddingHorizontal: 8,
                    marginVertical: 8,
                    marginHorizontal: 4,
                    borderRadius: 8,
                    textAlignVertical: numberOfLines && numberOfLines > 1 ? `top` : `center`,
                }}
                placeholder="----"
                placeholderTextColor={color.text._400}
            />
        </View>
    )
}

export default ThemedTextInput
