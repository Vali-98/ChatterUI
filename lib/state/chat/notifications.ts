import * as Notifications from 'expo-notifications'

import { AppSettings } from '@lib/constants/GlobalValues'
import { mmkv } from '@lib/storage/MMKV'

export const notifyGenerationComplete = async (notification: {
    chatId: number
    characterId: number
    characterName: string
    text: string
}) => {
    const showText = mmkv.getBoolean(AppSettings.ShowNotificationText)
    await Notifications.scheduleNotificationAsync({
        content: {
            title: showText ? notification.characterName : 'Response Complete',
            body: showText ? notification.text.trim() : 'ChatterUI has finished a response.',
            sound: mmkv.getBoolean(AppSettings.PlayNotificationSound),
            vibrate: mmkv.getBoolean(AppSettings.VibrateNotification) ? [250, 125, 250] : undefined,
            badge: 0,
            data: { chatId: notification.chatId, characterId: notification.characterId },
        },
        trigger: null,
    })
    await Notifications.setBadgeCountAsync(0)
}
