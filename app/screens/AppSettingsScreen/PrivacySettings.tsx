import { useTranslation } from 'react-i18next'

import SettingsPage from '@components/settings/SettingsPage'

import SecuritySettings from './SecuritySettings'

export default function PrivacySettings() {
    const { t } = useTranslation()
    return (
        <SettingsPage title={t('settings.categories.privacy.title')}>
            <SecuritySettings />
        </SettingsPage>
    )
}
