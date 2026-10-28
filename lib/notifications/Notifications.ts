import * as Notifications from 'expo-notifications'
import { router } from 'expo-router'
import { t } from 'i18next'
import { useCallback, useEffect } from 'react'
import { AppState, Linking } from 'react-native'
import { useMMKVBoolean } from 'react-native-mmkv'

import Alert from '@components/views/Alert'
import { AppSettings } from '@lib/constants/GlobalValues'
import { Characters } from '@lib/state/characters'
import { Chats } from '@lib/state/chat'
import { Logger } from '@lib/state/Logger'
import { mmkv } from '@lib/storage/MMKV'

import { ensureCompletionNotificationChannel } from './channels'

export const setupNotifications = () => {
    Notifications.setNotificationHandler({
        handleNotification: async () => {
            const background = AppState.currentState !== 'active'
            return {
                shouldPlaySound: background && !!mmkv.getBoolean(AppSettings.PlayNotificationSound),
                shouldSetBadge: false,
                shouldShowBanner: background,
                shouldShowList: background,
            }
        },
    })
}

export async function registerForPushNotificationsAsync() {
    await ensureCompletionNotificationChannel()
    let permissions = await Notifications.getPermissionsAsync()
    if (!permissions.granted && permissions.canAskAgain) {
        permissions = await Notifications.requestPermissionsAsync()
    }
    if (!permissions.granted) {
        Alert.alert({
            title: t('common.errors.permissionRequired'),
            description: t('settings.notification.permissionDescription'),
            buttons: [
                {
                    label: t('common.actions.cancel'),
                },
                {
                    label: t('common.actions.openSettings'),
                    onPress: () => {
                        Linking.openSettings()
                    },
                },
            ],
        })
        return false
    }

    return true
}

export function useAppStateNotificationObserver() {
    const [autoLoad] = useMMKVBoolean(AppSettings.ChatOnStartup)
    const [useAuth] = useMMKVBoolean(AppSettings.LocallyAuthenticateUser)
    const { chatId: chatActive, setId } = Chats.useChat()
    const { setCard } = Characters.useCharacterState()

    const redirect = useCallback(
        async (notification: Notifications.Notification) => {
            if (chatActive ?? autoLoad ?? useAuth) return

            const data = notification.request.content.data
            const chatId = data?.chatId as number | undefined
            const characterId = data?.characterId as number | undefined

            if (chatId && characterId) {
                Logger.info('Loading chat from notification')
                try {
                    await setId(chatId)
                    await setCard(characterId)
                    router.navigate('/screens/ChatScreen')
                    Notifications.clearLastNotificationResponse()
                } catch (e) {
                    Logger.error('Failed to load chat: ' + e)
                }
            }
        },
        [chatActive, autoLoad, useAuth, setId, setCard]
    )

    useEffect(() => {
        const listener = AppState.addEventListener('change', async (nextState) => {
            if (nextState !== 'active') return

            const response = Notifications.getLastNotificationResponse()
            if (!response?.notification) {
                if ((await Notifications.getPresentedNotificationsAsync()).length > 0) {
                    await Notifications.dismissAllNotificationsAsync()
                }
                return
            }

            redirect(response.notification)
        })

        return () => {
            listener.remove()
        }
    }, [redirect])
}
