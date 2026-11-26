import { useTranslation } from 'react-i18next'
import { Linking } from 'react-native'

import ThemedButton from '@components/buttons/ThemedButton'

import SettingsPage from '@components/settings/SettingsPage'

import SecuritySettings from './SecuritySettings'

export default function PrivacySettings() {
    const { t } = useTranslation()
    return (
        <SettingsPage title={t('settings.categories.privacy.title')}>
            <SecuritySettings />
            <ThemedButton
                label={t('settings.privacy.policy')}
                onPress={() => Linking.openURL('https://chatterui.valis-lab.com/privacy/')}
            />
        </SettingsPage>
    )
}
