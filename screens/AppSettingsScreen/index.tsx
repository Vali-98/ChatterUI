import { useTranslation } from 'react-i18next'

import SettingsLink from '@components/settings/SettingsLink'
import SettingsPage from '@components/settings/SettingsPage'

import LanguageSettings from './LanguageSettings'

const AppSettingsMenu = () => {
    const { t } = useTranslation()
    return (
        <SettingsPage title={t('settings.title')}>
            <SettingsLink
                href="/settings/appearance"
                icon="skin"
                title={t('settings.categories.appearance.title')}
                description={t('settings.categories.appearance.description')}
            />
            <SettingsLink
                href="/settings/chat"
                icon="message"
                title={t('settings.categories.chat.title')}
                description={t('settings.categories.chat.description')}
            />
            <SettingsLink
                href="/settings/generation"
                icon="control"
                title={t('settings.categories.generation.title')}
                description={t('settings.categories.generation.description')}
            />
            <SettingsLink
                href="/settings/device"
                icon="bell"
                title={t('settings.categories.device.title')}
                description={t('settings.categories.device.description')}
            />
            <SettingsLink
                href="/settings/data"
                icon="database"
                title={t('settings.categories.data.title')}
                description={t('settings.categories.data.description')}
            />
            <SettingsLink
                href="/settings/privacy"
                icon="lock"
                title={t('settings.categories.privacy.title')}
                description={t('settings.categories.privacy.description')}
            />
            <LanguageSettings />
            <SettingsLink
                href="/settings/advanced"
                icon="code"
                title={t('settings.categories.advanced.title')}
                description={t('settings.categories.advanced.description')}
            />
        </SettingsPage>
    )
}

export default AppSettingsMenu
