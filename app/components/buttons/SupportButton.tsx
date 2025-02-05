import { FontAwesome } from '@expo/vector-icons'
import { Theme } from '@lib/theme/ThemeManager'
import React from 'react'
import { Linking } from 'react-native'

import ThemedButton from './ThemedButton'

const SupportButton = () => {
    const theme = Theme.useTheme()

    return (
        <ThemedButton
            onPress={() => {
                Linking.openURL('https://ko-fi.com/vali98')
            }}
            variant="secondary"
            label="Support ChatterUI"
            icon={<FontAwesome name="coffee" size={16} color={theme.color.primary._700} />}
        />
    )
}

export default SupportButton
