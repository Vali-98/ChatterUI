import AntDesign from '@react-native-vector-icons/ant-design/static'
import { Trans } from 'react-i18next'
import { Text, View } from 'react-native'

import { IconSizes } from '@lib/constants/IconSizes'
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
            <AntDesign name="file-unknown" size={IconSizes.empty} color={color.text._700} />
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
