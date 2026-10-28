import * as Notifications from 'expo-notifications'
import { Platform } from 'react-native'

export const COMPLETION_CHANNEL_ID = 'chatterUI'

export const ensureCompletionNotificationChannel = async () => {
    if (Platform.OS !== 'android') return
    await Notifications.setNotificationChannelAsync(COMPLETION_CHANNEL_ID, {
        name: 'chatterUI',
        importance: Notifications.AndroidImportance.DEFAULT,
        vibrationPattern: [250, 0, 250, 250],
        lightColor: '#7d6294',
    })
}
