import Alert from '@components/views/Alert'
import { Logger } from '@lib/state/Logger'
import * as Notifications from 'expo-notifications'
import { Linking, Platform } from 'react-native'

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

