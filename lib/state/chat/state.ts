import { create } from 'zustand'

import type { ScrollData } from './types'

export type ChatState = {
    id?: number
    scrollData?: ScrollData
    setChat: (chatId: number, scrollData?: ScrollData) => void
    reset: () => void
}

export const useChatState = create<ChatState>((set) => ({
    setChat: (id, scrollData) => set({ id, scrollData }),
    reset: () => set({ id: undefined, scrollData: undefined }),
}))
