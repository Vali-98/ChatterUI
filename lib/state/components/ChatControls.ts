import { create } from 'zustand'

import type { ChatMessage } from '@lib/state/chat/types'

export const useChatControlLayoutState = create<{
    inputHeight: number
    playerHeight: number
    playerId?: number
    setInputHeight: (height: number) => void
    setPlayerHeight: (height: number, playerId: number) => void
    releasePlayerHeight: (playerId: number) => void
}>((set) => ({
    inputHeight: 54,
    playerHeight: 0,
    setInputHeight: (height) => set({ inputHeight: Math.ceil(height) }),
    setPlayerHeight: (height, playerId) =>
        set({ playerHeight: Math.ceil(height), playerId: playerId }),
    releasePlayerHeight: (playerId) =>
        set((state) =>
            state.playerId === playerId ? { playerHeight: 0, playerId: undefined } : state
        ),
}))

export const useChatActionsState = create<{
    activeEntryId?: number
    activeEntry?: ChatMessage
    setActiveIndex: (id: number | undefined, entry?: ChatMessage) => void
    dismiss: (id?: number) => void
}>((set) => ({
    setActiveIndex: (id, entry) =>
        set((state) =>
            state.activeEntryId === id || id === undefined
                ? { activeEntryId: undefined, activeEntry: undefined }
                : { activeEntryId: id, activeEntry: entry?.id === id ? entry : undefined }
        ),
    dismiss: (id) =>
        set((state) =>
            id === undefined || state.activeEntryId === id
                ? { activeEntryId: undefined, activeEntry: undefined }
                : state
        ),
}))

// Observe selection without rerendering the message's Markdown tree on every tap.
export const observeChatActionSelection = (
    entryId: number,
    listener: (selected: boolean) => void
) => {
    let selected = useChatActionsState.getState().activeEntryId === entryId
    listener(selected)
    return useChatActionsState.subscribe((state) => {
        const next = state.activeEntryId === entryId
        if (next === selected) return
        selected = next
        listener(next)
    })
}
