import * as Notifications from 'expo-notifications'
import { act, createElement } from 'react'
import { AppState, Platform } from 'react-native'

import Alert from '../components/views/Alert'
import {
    registerForPushNotificationsAsync,
    setupNotifications,
    useAppStateNotificationObserver,
} from '../lib/notifications/Notifications'
import { notifyGenerationComplete } from '../lib/state/chat/notifications'
import { COMPLETION_VIBRATION_PATTERN } from '../lib/notifications/channels'

jest.mock('expo-notifications', () => ({
    setNotificationHandler: jest.fn(),
    setNotificationChannelAsync: jest.fn(async () => null),
    getNotificationChannelAsync: jest.fn(async () => null),
    getPermissionsAsync: jest.fn(),
    requestPermissionsAsync: jest.fn(),
    scheduleNotificationAsync: jest.fn(async () => 'one'),
    setBadgeCountAsync: jest.fn(async () => true),
    getLastNotificationResponse: jest.fn(() => null),
    getPresentedNotificationsAsync: jest.fn(async () => []),
    dismissNotificationAsync: jest.fn(async () => {}),
    dismissAllNotificationsAsync: jest.fn(async () => {}),
    AndroidImportance: { DEFAULT: 3 },
}))
jest.mock('expo-router', () => ({ router: {} }))
jest.mock('i18next', () => ({ t: (key: string) => key }))
jest.mock('react-native-mmkv', () => ({ useMMKVBoolean: () => [false, jest.fn()] }))
jest.mock('../lib/storage/MMKV', () => ({ mmkv: { getBoolean: () => false } }))
jest.mock('../lib/state/characters', () => ({
    Characters: { useCharacterState: () => ({ setCard: jest.fn() }) },
}))
jest.mock('../lib/state/chat', () => ({
    Chats: { useChat: () => ({ chatId: 1, setId: jest.fn() }) },
}))
jest.mock('../lib/state/Logger', () => ({ Logger: {} }))
jest.mock('../components/views/Alert', () => ({
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

test('successive background completions are delivered without clearing notifications', async () => {
    await notifyGenerationComplete(notification)
    await notifyGenerationComplete({ ...notification, text: 'Another response' })
    expect(Notifications.scheduleNotificationAsync).toHaveBeenCalledTimes(2)
    expect(Notifications.setBadgeCountAsync).not.toHaveBeenCalled()
    expect(Notifications.dismissAllNotificationsAsync).not.toHaveBeenCalled()
})

test('returning to the app clears completion notifications without removing the background service', async () => {
    const { create } = require('react-test-renderer')
    Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true })
    const listen = jest.spyOn(AppState, 'addEventListener').mockReturnValue({ remove: jest.fn() })
    const Observer = () => {
        useAppStateNotificationObserver()
        return null
    }
    const presented = (identifier: string, data: Record<string, unknown>) =>
        ({ request: { identifier, content: { data } } }) as Notifications.Notification
    jest.mocked(Notifications.getPresentedNotificationsAsync).mockResolvedValueOnce([
        presented('background-service', {}),
        presented('first', { chatId: 1, characterId: 2 }),
        presented('second', { chatId: 3, characterId: 4 }),
    ])
    let screen: ReturnType<typeof create>
    try {
        await act(async () => {
            screen = create(createElement(Observer))
        })
        await act(async () => {
            await listen.mock.calls.at(-1)![1]('active')
        })
        expect(jest.mocked(Notifications.dismissNotificationAsync).mock.calls).toEqual([
            ['first'],
            ['second'],
        ])
        expect(Notifications.dismissAllNotificationsAsync).not.toHaveBeenCalled()
    } finally {
        await act(async () => screen?.unmount())
        listen.mockRestore()
    }
})

test('background completions use the configured channel, foreground completions stay silent', async () => {
    await notifyGenerationComplete(notification)
    expect(Notifications.setNotificationChannelAsync).toHaveBeenCalledWith(
        'chatterUI-completions',
        expect.objectContaining({ vibrationPattern: COMPLETION_VIBRATION_PATTERN })
    )
    expect(Notifications.scheduleNotificationAsync).toHaveBeenCalledWith(
        expect.objectContaining({ trigger: { channelId: 'chatterUI-completions' } })
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

test('the corrected vibration channel converts native readback into valid creation options', async () => {
    jest.mocked(Notifications.getNotificationChannelAsync)
        .mockResolvedValueOnce(null)
        .mockResolvedValueOnce({
            id: 'chatterUI',
            name: 'chatterUI',
            importance: Notifications.AndroidImportance.DEFAULT,
            bypassDnd: false,
            description: null,
            groupId: null,
            lightColor: '#7d6294',
            lockscreenVisibility: 0,
            showBadge: false,
            audioAttributes: {
                usage: 5,
                contentType: 4,
                flags: {
                    enforceAudibility: false,
                    requestHardwareAudioVideoSynchronization: false,
                },
            },
            vibrationPattern: [250, 0, 250, 250],
            enableLights: false,
            enableVibrate: false,
            sound: 'custom',
        })
    jest.mocked(Notifications.setNotificationChannelAsync).mockImplementationOnce(
        async (_, options) => {
            // Expo's Android bridge tries to create a group whenever this key is present.
            if ('groupId' in options && !options.groupId)
                throw new Error('Invalid notification group')
            return null
        }
    )
    await notifyGenerationComplete(notification)
    expect(Notifications.setNotificationChannelAsync).toHaveBeenCalledWith(
        'chatterUI-completions',
        expect.objectContaining({
            enableVibrate: false,
            vibrationPattern: COMPLETION_VIBRATION_PATTERN,
        })
    )
    const options = jest.mocked(Notifications.setNotificationChannelAsync).mock.calls[0][1]
    expect(options).not.toHaveProperty('groupId')
    expect(options.sound).not.toBe('custom')
    expect(Notifications.scheduleNotificationAsync).toHaveBeenCalledTimes(1)
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
