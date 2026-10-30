import { useTranslation } from 'react-i18next'

import SettingsPage from '@components/settings/SettingsPage'

import CharacterSettings from './CharacterSettings'
import DatabaseSettings from './DatabaseSettings'

export default function DataSettings() {
    const { t } = useTranslation()
    return (
        <SettingsPage title={t('settings.categories.data.title')}>
            <DatabaseSettings />
            <CharacterSettings />
        </SettingsPage>
    )
}
