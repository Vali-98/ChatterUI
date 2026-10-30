import React, { act } from 'react'
import { BackHandler } from 'react-native'

import { ChatActionAnchorProvider } from '../screens/ChatScreen/ChatWindow/ChatActionAnchor'
import ChatActionOverlay from '../screens/ChatScreen/ChatWindow/ChatActionOverlay'
import type { ChatMessage } from '../lib/state/chat/types'
import { useChatActionsState } from '../lib/state/components/ChatControls'

jest.mock('expo-router', () => ({
    useFocusEffect: (effect: () => void) => require('react').useEffect(effect, [effect]),
}))
jest.mock('../lib/engine/generation/hooks', () => ({ useChatGenerating: () => false }))
jest.mock('../lib/hooks/liveQuery', () => ({
    useLiveQueryAsync: (_query: unknown, options: { initialData?: unknown; enabled: boolean }) => ({
        data: options.enabled ? options.initialData : undefined,
    }),
}))
jest.mock('../lib/state/chat', () => ({
    Chats: { db: { live: { message: jest.fn() } } },
}))
jest.mock('../lib/state/components/chatControlBounds', () => ({
    chatControlLift: { value: 0 },
}))
jest.mock('../screens/ChatScreen/ChatWindow/ChatQuickActions', () => ({
    __esModule: true,
    default: () =>
        require('react').createElement(require('react-native').View, { testID: 'actions' }),
}))
// Measurements and UI-thread callbacks deliberately never arrive. Opening a selected menu
// must not leave its native touch handling dependent on an animation callback.
jest.mock('react-native-reanimated', () => ({
    __esModule: true,
    default: { View: require('react-native').View },
    useAnimatedRef: () => require('react').useRef(null),
    useSharedValue: (value: unknown) =>
        require('react').useMemo(() => ({ value: value, set: jest.fn() }), []),
    useFrameCallback: () => require('react').useMemo(() => ({ setActive: jest.fn() }), []),
    useAnimatedStyle: () => ({}),
    useAnimatedReaction: jest.fn(),
    runOnJS: (callback: unknown) => callback,
    FadeIn: { duration: jest.fn() },
    FadeOut: { duration: jest.fn() },
}))

const { create } = require('react-test-renderer')
Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true })

test('Back dismissal allows repeated opens and cannot dismiss a newer selection', async () => {
    const listeners = new Set<Parameters<typeof BackHandler.addEventListener>[1]>()
    const subscription = jest
        .spyOn(BackHandler, 'addEventListener')
        .mockImplementation((_event, listener) => {
            listeners.add(listener)
            return { remove: () => listeners.delete(listener) }
        })
    const event = { type: 'hardwareBackPress', timeStamp: 0 }
    const back = () => [...listeners].reverse().some((listener) => listener(event))
    const select = (id: number) => {
        const entry = {
            id: id,
            chat_id: 1,
            swipes: [{ id: id, active: true, swipe: 'message' }],
        } as ChatMessage
        useChatActionsState.getState().setActiveIndex(id, entry)
    }
    let screen: ReturnType<typeof create>
    await act(async () => {
        screen = create(
            <ChatActionAnchorProvider>
                <ChatActionOverlay chatId={1} />
            </ChatActionAnchorProvider>
        )
    })
    try {
        expect(back()).toBe(false)
        for (const id of [1, 1, 2, 1]) {
            await act(async () => select(id))
            let node = screen.root.findByProps({ testID: 'actions' })
            while (node) {
                expect(node.props.pointerEvents).not.toBe('none')
                expect(node.props.pointerEvents).not.toBe('box-only')
                node = node.parent
            }
            await act(async () => expect(back()).toBe(true))
            expect(screen.root.findAllByProps({ testID: 'actions' })).toHaveLength(0)
            expect(useChatActionsState.getState().activeEntryId).toBeUndefined()
        }
        await act(async () => select(1))
        const previousBackHandler = [...listeners].at(-1)!
        await act(async () => select(2))
        await act(async () => previousBackHandler(event))
        expect(useChatActionsState.getState().activeEntryId).toBe(2)
        await act(async () => expect(back()).toBe(true))
        expect(back()).toBe(false)
    } finally {
        await act(async () => screen.unmount())
        expect(listeners.size).toBe(0)
        subscription.mockRestore()
    }
})
