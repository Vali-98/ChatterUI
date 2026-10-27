import { useTranslation } from 'react-i18next'

import SettingsLink from '@components/settings/SettingsLink'
import SettingsPage from '@components/settings/SettingsPage'

import LanguageSettings from './LanguageSettings'

const AppSettingsMenu = () => {
    const { t } = useTranslation()
    return (
        <SettingsPage title={t('settings.title')}>
            <SettingsLink
                href="/screens/AppSettingsScreen/AppearanceSettings"
                icon="skin"
                title={t('settings.categories.appearance.title')}
                description={t('settings.categories.appearance.description')}
            />
            <SettingsLink
                href="/screens/AppSettingsScreen/ChatSettings"
                icon="message"
                title={t('settings.categories.chat.title')}
                description={t('settings.categories.chat.description')}
            />
            <SettingsLink
                href="/screens/AppSettingsScreen/GeneratingSettings"
                icon="control"
                title={t('settings.categories.generation.title')}
                description={t('settings.categories.generation.description')}
            />
            <SettingsLink
                href="/screens/AppSettingsScreen/DeviceSettings"
                icon="bell"
                title={t('settings.categories.device.title')}
                description={t('settings.categories.device.description')}
            />
            <SettingsLink
                href="/screens/AppSettingsScreen/DataSettings"
                icon="database"
                title={t('settings.categories.data.title')}
                description={t('settings.categories.data.description')}
            />
            <SettingsLink
                href="/screens/AppSettingsScreen/PrivacySettings"
                icon="lock"
                title={t('settings.categories.privacy.title')}
                description={t('settings.categories.privacy.description')}
            />
            <LanguageSettings />
            <SettingsLink
                href="/screens/AppSettingsScreen/AdvancedSettings"
                icon="code"
                title={t('settings.categories.advanced.title')}
                description={t('settings.categories.advanced.description')}
            />
        </SettingsPage>
    )
}

export default AppSettingsMenu
