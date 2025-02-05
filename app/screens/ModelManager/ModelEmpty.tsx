import { AntDesign } from '@expo/vector-icons'
import { Theme } from '@lib/theme/ThemeManager'
import { Text, View } from 'react-native'

const ModelEmpty = () => {
    const { color, spacing, fontSize } = Theme.useTheme()
    return (
        <View
            style={{
                justifyContent: 'center',
                alignItems: 'center',
                flex: 1,
            }}>
            <AntDesign name="unknowfile1" size={60} color={color.text._700} />
            <Text
                style={{
                    color: color.text._700,
                    marginTop: spacing.xl,
                    fontStyle: 'italic',
                    fontSize: fontSize.l,
                }}>
                No Models Found. Try Importing Some!
            </Text>
        </View>
    )
}

export default ModelEmpty
