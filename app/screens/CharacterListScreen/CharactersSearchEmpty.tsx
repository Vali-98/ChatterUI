import { Ionicons } from '@expo/vector-icons'
import { useTranslation } from 'react-i18next'
import { Text, View } from 'react-native'

import { Theme } from '@lib/theme/ThemeManager'

const CharSearchEmpty = () => {
    const { t } = useTranslation()
    const { color, spacing, fontSize } = Theme.useTheme()
    return (
        <View
            style={{
                paddingVertical: spacing.xl,
                paddingHorizontal: spacing.m,
                flex: 1,
                alignItems: 'center',
                marginTop: spacing.xl3,
            }}>
            <Ionicons name="search" color={color.text._400} size={60} />
            <Text
                style={{
                    color: color.text._400,
                    marginTop: spacing.xl,
                    fontStyle: 'italic',
                    fontSize: fontSize.l,
                }}>
                {t('character.list.nocharactersmatch')}
            </Text>
        </View>
    )
}

export default CharSearchEmpty
