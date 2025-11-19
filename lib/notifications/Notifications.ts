import * as Notifications from 'expo-notifications'
import { usePathname, useRouter } from 'expo-router'
import { useEffect } from 'react'
import { Linking, Platform } from 'react-native'
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
            lightColor: '#FF231F7C',
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

export function useNotificationObserver() {
    const [autoLoad] = useMMKVBoolean(AppSettings.ChatOnStartup)
    const [useAuth] = useMMKVBoolean(AppSettings.LocallyAuthenticateUser)
    const { chat, loadChat } = Chats.useChat()
    const { setCard } = Characters.useCharacterStore()
    const router = useRouter()
    const path = usePathname()

    useEffect(() => {
        let isMounted = true
        async function redirect(notification: Notifications.Notification) {
            if (chat ?? autoLoad ?? useAuth) return
            const data = notification.request.content.data
            const chatId = data?.chatId as number | undefined
            const characterId = data?.characterId as number | undefined
            if (chatId && characterId) {
                Logger.info('Loading chat from notification')
                try {
                    await loadChat(chatId)
                    await setCard(characterId)
                    if (path !== '/screens/ChatScreen') {
                        router.dismissTo('/')
                        router.push('/screens/ChatScreen')
                        Notifications.clearLastNotificationResponse()
                    }
                } catch (e) {
                    Logger.error('Failed to load chat: ' + e)
                }
            }
        }

        const response = Notifications.getLastNotificationResponse()
        if (!isMounted || !response?.notification) {
            return
        }
        redirect(response?.notification)

        const subscription = Notifications.addNotificationResponseReceivedListener((response) => {
            redirect(response.notification)
        })

        return () => {
            isMounted = false
            subscription.remove()
        }
    }, [autoLoad, useAuth, chat, loadChat, router, setCard, path])
}
