import { create } from 'zustand'

import type { CompletionTimings } from '@db/schema'

import type { OutputBuffer, ScrollData } from './types'

export type ChatState = {
    id?: number
    scrollData?: ScrollData
    buffer: OutputBuffer
    setChat: (chatId: number, scrollData?: ScrollData) => void
    reset: () => void
    setBuffer: (buffer: OutputBuffer) => void
    setBufferTimings: (timings: CompletionTimings) => void
    insertToBuffer: (text: string) => void
}

export const useChatState = create<ChatState>((set) => ({
    buffer: { data: '' },
    setChat: (id, scrollData) => set({ id, scrollData }),
    reset: () => set({ id: undefined, scrollData: undefined }),
    setBuffer: (buffer) => set({ buffer }),
    setBufferTimings: (timings) => set((state) => ({ buffer: { ...state.buffer, timings } })),
    insertToBuffer: (text) =>
        set((state) => ({ buffer: { ...state.buffer, data: state.buffer.data + text } })),
}))
