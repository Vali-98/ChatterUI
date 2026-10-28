import * as Notifications from 'expo-notifications'
import { AppState, Platform } from 'react-native'

import Alert from '../app/components/views/Alert'
import {
    registerForPushNotificationsAsync,
    setupNotifications,
} from '../lib/notifications/Notifications'
import { notifyGenerationComplete } from '../lib/state/chat/notifications'

jest.mock('expo-notifications', () => ({
    setNotificationHandler: jest.fn(),
    setNotificationChannelAsync: jest.fn(async () => null),
    getPermissionsAsync: jest.fn(),
    requestPermissionsAsync: jest.fn(),
    scheduleNotificationAsync: jest.fn(async () => 'one'),
    setBadgeCountAsync: jest.fn(async () => true),
    AndroidImportance: { DEFAULT: 3 },
}))
jest.mock('expo-router', () => ({ router: {} }))
jest.mock('i18next', () => ({ t: (key: string) => key }))
jest.mock('react-native-mmkv', () => ({ useMMKVBoolean: jest.fn() }))
jest.mock('../lib/storage/MMKV', () => ({ mmkv: { getBoolean: () => false } }))
jest.mock('../lib/state/characters', () => ({ Characters: {} }))
jest.mock('../lib/state/chat', () => ({ Chats: {} }))
jest.mock('../lib/state/Logger', () => ({ Logger: {} }))
jest.mock('../app/components/views/Alert', () => ({
    __esModule: true,
    default: { alert: jest.fn() },
}))
const setAppState = (state: string) =>
    Object.defineProperty(AppState, 'currentState', { configurable: true, value: state })
const notification = { chatId: 1, characterId: 2, characterName: 'Bot', text: 'Hello' }
beforeEach(() => {
    jest.clearAllMocks()
    setAppState('background')
    Object.defineProperty(Platform, 'OS', { configurable: true, value: 'android' })
})

test('background completions use the configured channel, foreground completions stay silent', async () => {
    await notifyGenerationComplete(notification)
    expect(Notifications.setNotificationChannelAsync).toHaveBeenCalledWith(
        'chatterUI',
        expect.any(Object)
    )
    expect(Notifications.scheduleNotificationAsync).toHaveBeenCalledWith(
        expect.objectContaining({ trigger: { channelId: 'chatterUI' } })
    )
    jest.mocked(Notifications.scheduleNotificationAsync).mockClear()
    setAppState('active')
    await notifyGenerationComplete(notification)
    expect(Notifications.scheduleNotificationAsync).not.toHaveBeenCalled()
})

test('the handler allows background delivery but suppresses delivery after returning to foreground', async () => {
    setupNotifications()
    const handler = jest.mocked(Notifications.setNotificationHandler).mock.calls[0][0]!
    expect(await handler.handleNotification({} as Notifications.Notification)).toMatchObject({
        shouldShowBanner: true,
        shouldShowList: true,
    })
    setAppState('active')
    expect(await handler.handleNotification({} as Notifications.Notification)).toMatchObject({
        shouldShowBanner: false,
        shouldShowList: false,
        shouldPlaySound: false,
    })
})

test('enabling notifications requests OS permission instead of assuming it was granted', async () => {
    jest.mocked(Notifications.getPermissionsAsync).mockResolvedValue({
        granted: false,
        canAskAgain: true,
    } as Notifications.NotificationPermissionsStatus)
    jest.mocked(Notifications.requestPermissionsAsync).mockResolvedValue({
        granted: true,
    } as Notifications.NotificationPermissionsStatus)
    expect(await registerForPushNotificationsAsync()).toBe(true)
    expect(Notifications.requestPermissionsAsync).toHaveBeenCalledTimes(1)
    jest.mocked(Notifications.getPermissionsAsync).mockResolvedValue({
        granted: false,
        canAskAgain: false,
    } as Notifications.NotificationPermissionsStatus)
    expect(await registerForPushNotificationsAsync()).toBe(false)
    expect(Alert.alert).toHaveBeenCalled()
})
