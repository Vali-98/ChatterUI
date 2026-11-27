import {
    AndroidImportance,
    getNotificationChannelAsync,
    setNotificationChannelAsync,
} from 'expo-notifications'
import { Platform } from 'react-native'

export const COMPLETION_CHANNEL_ID = 'chatterUI-completions'
// Android alternates delay, vibration, pause, vibration.
export const COMPLETION_VIBRATION_PATTERN = [0, 500, 200, 500]

export const ensureCompletionNotificationChannel = async () => {
    if (Platform.OS !== 'android') return
    if (await getNotificationChannelAsync(COMPLETION_CHANNEL_ID)) return
    // Existing channels cannot change their vibration pattern. Preserve user preferences.
    const previous = await getNotificationChannelAsync('chatterUI')
    // Native readback uses null for an absent group and "custom" for an unknown sound URI.
    // Neither is a valid creation option: a null group makes Android try to create it.
    const { groupId, sound, ...options } = previous ?? {}
    await setNotificationChannelAsync(COMPLETION_CHANNEL_ID, {
        ...options,
        name: 'chatterUI',
        importance: previous?.importance ?? AndroidImportance.DEFAULT,
        vibrationPattern: COMPLETION_VIBRATION_PATTERN,
        lightColor: previous?.lightColor ?? '#7d6294',
        ...(groupId ? { groupId } : {}),
        ...(sound === null || sound === 'default' ? { sound } : {}),
    })
}
