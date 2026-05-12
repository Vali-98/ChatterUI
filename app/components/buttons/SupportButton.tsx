import { FontAwesome } from '@expo/vector-icons'
import React from 'react'
import { useTranslation } from 'react-i18next'
import { Linking } from 'react-native'

import { Theme } from '@lib/theme/ThemeManager'

import ThemedButton from './ThemedButton'

const SupportButton = () => {
    const theme = Theme.useTheme()
    const { t } = useTranslation()

    return (
        <ThemedButton
            onPress={() => {
                Linking.openURL('https://ko-fi.com/vali98')
            }}
            variant="secondary"
            label={t('about.support.button')}
            icon={<FontAwesome name="coffee" size={16} color={theme.color.primary._700} />}
        />
    )
}

export default SupportButton
