import { useTranslation } from 'react-i18next'
import { Linking } from 'react-native'

import ThemedButton from './ThemedButton'

const SupportButton = () => {
    const { t } = useTranslation()

    return (
        <ThemedButton
            onPress={() => {
                Linking.openURL('https://ko-fi.com/vali98')
            }}
            variant="secondary"
            label={t('about.support.button')}
            iconName={{ family: 'material', name: 'coffee' }}
            iconSize={16}
        />
    )
}

export default SupportButton
