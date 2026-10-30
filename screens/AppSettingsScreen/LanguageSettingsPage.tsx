import { useTranslation } from 'react-i18next'

import SettingsPage from '@components/settings/SettingsPage'

import LanguageSettings from './LanguageSettings'

export default function LanguageSettingsPage() {
    const { t } = useTranslation()
    return (
        <SettingsPage title={t('settings.language.title')}>
            <LanguageSettings />
        </SettingsPage>
    )
}
