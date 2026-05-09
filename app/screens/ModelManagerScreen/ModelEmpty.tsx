import { AntDesign } from '@expo/vector-icons'
import { Trans } from 'react-i18next'
import { Text, View } from 'react-native'

import { Theme } from '@lib/theme/ThemeManager'

const ModelEmpty = () => {
    const { color, spacing, fontSize } = Theme.useTheme()
    return (
        <View
            style={{
                justifyContent: 'center',
                alignItems: 'center',
                flex: 1,
            }}>
            <AntDesign name="file-unknown" size={60} color={color.text._700} />
            <Text
                style={{
                    color: color.text._700,
                    marginTop: spacing.xl,
                    fontStyle: 'italic',
                    fontSize: fontSize.l,
                }}>
                <Trans i18nKey="model.empty" />
            </Text>
        </View>
    )
}

export default ModelEmpty
