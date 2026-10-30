import * as Notifications from 'expo-notifications'
import { Platform } from 'react-native'

export const COMPLETION_CHANNEL_ID = 'chatterUI-completions'
// Android alternates delay, vibration, pause, vibration.
export const COMPLETION_VIBRATION_PATTERN = [0, 250, 125, 250]

export const ensureCompletionNotificationChannel = async () => {
    if (Platform.OS !== 'android') return
    if (await Notifications.getNotificationChannelAsync(COMPLETION_CHANNEL_ID)) return
    // Existing channels cannot change their vibration pattern. Preserve user preferences.
    const previous = await Notifications.getNotificationChannelAsync('chatterUI')
    await Notifications.setNotificationChannelAsync(COMPLETION_CHANNEL_ID, {
        ...previous,
        name: 'chatterUI',
        importance: previous?.importance ?? Notifications.AndroidImportance.DEFAULT,
        vibrationPattern: COMPLETION_VIBRATION_PATTERN,
        lightColor: previous?.lightColor ?? '#7d6294',
    })
}
