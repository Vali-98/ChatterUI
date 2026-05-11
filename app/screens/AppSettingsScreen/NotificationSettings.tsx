import React from 'react'
import { useTranslation } from 'react-i18next'
import { View } from 'react-native'
import { useMMKVBoolean } from 'react-native-mmkv'

import ThemedSwitch from '@components/input/ThemedSwitch'
import SectionTitle from '@components/text/SectionTitle'
import { AppSettings } from '@lib/constants/GlobalValues'
import { registerForPushNotificationsAsync } from '@lib/notifications/Notifications'

const NotificationSettings = () => {
    const { t } = useTranslation()
    const [notificationOnGenerate, setNotificationOnGenerate] = useMMKVBoolean(
        AppSettings.NotifyOnComplete
    )
    const [notificationSound, setNotificationSound] = useMMKVBoolean(
        AppSettings.PlayNotificationSound
    )
    const [notificationVibrate, setNotificationVibrate] = useMMKVBoolean(
        AppSettings.VibrateNotification
    )
    const [showNotificationText, setShowNotificationText] = useMMKVBoolean(
        AppSettings.ShowNotificationText
    )

    return (
        <View>
            <SectionTitle>{t('settings.notification.title')}</SectionTitle>
            <ThemedSwitch
                label={t('settings.notification.enableNotifications')}
                value={notificationOnGenerate}
                onChangeValue={async (value) => {
                    if (!value) {
                        setNotificationOnGenerate(false)
                        return
                    }

                    const granted = await registerForPushNotificationsAsync()
                    if (granted) {
                        setNotificationOnGenerate(true)
                    }
                }}
                description={t('settings.notification.enableNotificationsDescription')}
            />
            {notificationOnGenerate && (
                <View>
                    <ThemedSwitch
                        label={t('settings.notification.playSound')}
                        value={notificationSound}
                        onChangeValue={setNotificationSound}
                        description=""
                    />

                    <ThemedSwitch
                        label={t('settings.notification.vibrate')}
                        value={notificationVibrate}
                        onChangeValue={setNotificationVibrate}
                        description=""
                    />

                    <ThemedSwitch
                        label={t('settings.notification.showText')}
                        value={showNotificationText}
                        onChangeValue={setShowNotificationText}
                        description={t('settings.notification.showTextDescription')}
                    />
                </View>
            )}
        </View>
    )
}

export default NotificationSettings
