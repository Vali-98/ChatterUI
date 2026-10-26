import {
    observeChatActionSelection,
    useChatActionsState,
    useChatControlLayoutState,
} from '../lib/state/components/ChatControls'
import type { ChatMessage } from '../lib/state/chat/types'

beforeEach(() => {
    useChatActionsState.getState().dismiss()
    useChatControlLayoutState.setState({ playerHeight: 0, playerId: undefined })
})

test('selection carries the already loaded message and releases it on dismissal', () => {
    const entry = { id: 1 } as ChatMessage
    useChatActionsState.getState().setActiveIndex(1, entry)
    expect(useChatActionsState.getState().activeEntry).toBe(entry)
    useChatActionsState.getState().setActiveIndex(1, entry)
    expect(useChatActionsState.getState().activeEntryId).toBeUndefined()
    expect(useChatActionsState.getState().activeEntry).toBeUndefined()
    useChatActionsState.getState().setActiveIndex(2, entry)
    expect(useChatActionsState.getState().activeEntry).toBeUndefined()
})

test('anchor observers react only to selection changes and restore remounted anchors', () => {
    const listener = jest.fn()
    const unsubscribe = observeChatActionSelection(1, listener)
    expect(listener.mock.calls).toEqual([[false]])
    useChatActionsState.getState().setActiveIndex(1)
    useChatActionsState.setState({ activeEntry: { id: 1 } as ChatMessage })
    expect(listener.mock.calls).toEqual([[false], [true]])
    const remounted = jest.fn()
    const removeRemounted = observeChatActionSelection(1, remounted)
    expect(remounted).toHaveBeenLastCalledWith(true)
    useChatActionsState.getState().setActiveIndex(2)
    expect(listener.mock.calls).toEqual([[false], [true], [false]])
    unsubscribe()
    removeRemounted()
    useChatActionsState.getState().dismiss()
    expect(listener).toHaveBeenCalledTimes(3)
})

test('an exiting player cannot release the space owned by its replacement', () => {
    const layout = useChatControlLayoutState.getState()
    layout.setPlayerHeight(38, 1)
    layout.setPlayerHeight(38, 2)
    layout.releasePlayerHeight(1)
    expect(useChatControlLayoutState.getState().playerHeight).toBe(38)
    layout.releasePlayerHeight(2)
    expect(useChatControlLayoutState.getState().playerHeight).toBe(0)
})
