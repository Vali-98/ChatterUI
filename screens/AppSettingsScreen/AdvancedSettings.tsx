import { useTranslation } from 'react-i18next'

import GenerationDebugSettings from '@components/settings/GenerationDebugSettings'
import SettingsLink from '@components/settings/SettingsLink'
import SettingsPage from '@components/settings/SettingsPage'

export default function AdvancedSettings() {
    const { t } = useTranslation()
    return (
        <SettingsPage title={t('settings.categories.advanced.title')}>
            <GenerationDebugSettings />
            <SettingsLink href="/logs" icon="code" title={t('navigation.logs')} />
        </SettingsPage>
    )
}
