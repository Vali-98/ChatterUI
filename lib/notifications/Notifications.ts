import * as Notifications from 'expo-notifications'
import { router } from 'expo-router'
import { t } from 'i18next'
import { useCallback, useEffect, useRef } from 'react'
import { AppState, Linking } from 'react-native'
import { useMMKVBoolean } from 'react-native-mmkv'

import Alert from '@components/views/Alert'
import { AppSettings } from '@lib/constants/appSettings'
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
    const [useAuth] = useMMKVBoolean(AppSettings.LocallyAuthenticateUser)
    const { setId } = Chats.useChat()
    const opening = useRef(false)
    const { setCard } = Characters.useCharacterState()

    const redirect = useCallback(
        async (notification: Notifications.Notification) => {
            // Keep the existing app-lock restriction; an explicit tap overrides chat selection.
            if (useAuth || opening.current) return

            const data = notification.request.content.data
            const chatId = data?.chatId
            const characterId = data?.characterId

            if (typeof chatId === 'number' && typeof characterId === 'number') {
                opening.current = true
                Logger.info('Loading chat from notification')
                try {
                    if (!(await setId(chatId))) return
                    setCard(characterId)
                    router.navigate('/chat')
                    Notifications.clearLastNotificationResponse()
                } catch (e) {
                    Logger.error('Failed to load chat: ' + e)
                } finally {
                    opening.current = false
                }
            }
        },
        [useAuth, setId, setCard]
    )

    useEffect(() => {
        const responseListener = Notifications.addNotificationResponseReceivedListener(
            (response) => void redirect(response.notification)
        )
        const listener = AppState.addEventListener('change', async (nextState) => {
            if (nextState !== 'active') return

            const response = Notifications.getLastNotificationResponse()
            if (!response?.notification) {
                const presented = await Notifications.getPresentedNotificationsAsync()
                await Promise.all(
                    presented
                        .filter(
                            (notification) =>
                                typeof notification.request.content.data?.chatId === 'number' &&
                                typeof notification.request.content.data?.characterId === 'number'
                        )
                        .map((notification) =>
                            Notifications.dismissNotificationAsync(notification.request.identifier)
                        )
                )
                return
            }

            redirect(response.notification)
        })

        return () => {
            listener.remove()
            responseListener.remove()
        }
    }, [redirect])
}
