import * as Notifications from 'expo-notifications'
import { AppState, Platform } from 'react-native'
import { t } from 'i18next'
import {
    COMPLETION_CHANNEL_ID,
    COMPLETION_VIBRATION_PATTERN,
    ensureCompletionNotificationChannel,
} from '@lib/notifications/channels'

import { AppSettings } from '@lib/constants/appSettings'
import { mmkv } from '@lib/storage/MMKV'

export const notifyGenerationComplete = async (notification: {
    chatId: number
    characterId: number
    characterName: string
    text: string
}) => {
    if (AppState.currentState === 'active') return
    await ensureCompletionNotificationChannel()
    const showText = mmkv.getBoolean(AppSettings.ShowNotificationText)
    await Notifications.scheduleNotificationAsync({
        content: {
            title: showText
                ? notification.characterName
                : t('settings.notification.responseComplete'),
            body: showText
                ? notification.text.trim()
                : t('settings.notification.responseCompleteDescription'),
            sound: mmkv.getBoolean(AppSettings.PlayNotificationSound),
            vibrate: mmkv.getBoolean(AppSettings.VibrateNotification)
                ? COMPLETION_VIBRATION_PATTERN
                : undefined,
            badge: 0,
            data: { chatId: notification.chatId, characterId: notification.characterId },
        },
        trigger: Platform.OS === 'android' ? { channelId: COMPLETION_CHANNEL_ID } : null,
    })
    await Notifications.setBadgeCountAsync(0)
}
