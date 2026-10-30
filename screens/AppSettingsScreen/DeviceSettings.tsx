import { useTranslation } from 'react-i18next'

import SettingsPage from '@components/settings/SettingsPage'

import NotificationSettings from './NotificationSettings'
import ScreenSettings from './ScreenSettings'

export default function DeviceSettings() {
    const { t } = useTranslation()
    return (
        <SettingsPage title={t('settings.categories.device.title')}>
            <NotificationSettings />
            <ScreenSettings />
        </SettingsPage>
    )
}
