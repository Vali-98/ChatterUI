import * as Notifications from 'expo-notifications'
import { router } from 'expo-router'
import { useCallback, useEffect } from 'react'
import { AppState, Linking, Platform } from 'react-native'
import { useMMKVBoolean } from 'react-native-mmkv'

import Alert from '@components/views/Alert'
import { AppSettings } from '@lib/constants/GlobalValues'
import { Characters } from '@lib/state/Characters'
import { Chats } from '@lib/state/Chat'
import { Logger } from '@lib/state/Logger'

export const setupNotifications = () => {
    Notifications.setNotificationHandler({
        handleNotification: async () => ({
            shouldPlaySound: false,
            shouldSetBadge: false,
            shouldShowAlert: false,
            shouldShowBanner: false,
            shouldShowList: false,
        }),
    })
}

export async function registerForPushNotificationsAsync() {
    if (Platform.OS === 'android') {
        await Notifications.setNotificationChannelAsync('chatterUI', {
            name: 'chatterUI',
            importance: Notifications.AndroidImportance.DEFAULT,
            vibrationPattern: [250, 0, 250, 250],
            lightColor: '#7d6294',
        })
    }

    const { status: existingStatus } = await Notifications.getPermissionsAsync()
    let finalStatus = existingStatus
    if (existingStatus !== 'granted') {
        const { status } = await Notifications.requestPermissionsAsync()
        finalStatus = status
    }
    if (finalStatus !== 'granted') {
        Alert.alert({
            title: 'Permission Required',
            description: 'ChatterUI requires permissions to send you notifications.',
            buttons: [
                {
                    label: 'Cancel',
                },
                {
                    label: 'Open Permissions',
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
    const { chat, loadChat } = Chats.useChat()
    const { setCard } = Characters.useCharacterStore()

    const redirect = useCallback(
        async (notification: Notifications.Notification) => {
            if (chat ?? autoLoad ?? useAuth) return

            const data = notification.request.content.data
            const chatId = data?.chatId as number | undefined
            const characterId = data?.characterId as number | undefined

            if (chatId && characterId) {
                Logger.info('Loading chat from notification')
                try {
                    await loadChat(chatId)
                    await setCard(characterId)
                    router.navigate('/screens/ChatScreen')
                    Notifications.clearLastNotificationResponse()
                } catch (e) {
                    Logger.error('Failed to load chat: ' + e)
                }
            }
        },
        [chat, autoLoad, useAuth, loadChat, setCard]
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
