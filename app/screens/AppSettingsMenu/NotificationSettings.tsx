import ThemedSwitch from '@components/input/ThemedSwitch'
import SectionTitle from '@components/text/SectionTitle'
import { AppSettings } from '@lib/constants/GlobalValues'
import { registerForPushNotificationsAsync } from '@lib/notifications/Notifications'
import React from 'react'
import { View } from 'react-native'
import { useMMKVBoolean } from 'react-native-mmkv'

const NotificationSettings = () => {
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
            <SectionTitle>Notifications</SectionTitle>
            <ThemedSwitch
                label="Enable Notifications"
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
                description="Sends notifications when the app is in the background"
            />
            {notificationOnGenerate && (
                <View>
                    <ThemedSwitch
                        label="Notification Sound"
                        value={notificationSound}
                        onChangeValue={setNotificationSound}
                        description=""
                    />

                    <ThemedSwitch
                        label="Notification Vibration"
                        value={notificationVibrate}
                        onChangeValue={setNotificationVibrate}
                        description=""
                    />

                    <ThemedSwitch
                        label="Show Text In Notification"
                        value={showNotificationText}
                        onChangeValue={setShowNotificationText}
                        description="Shows generated messages in notifications"
                    />
                </View>
            )}
        </View>
    )
}

export default NotificationSettings
