import { create } from 'zustand'

import { useChatState } from '../chat/state'

type ChatInputTextStoreProps = {
    text: string
    setText: (text: string) => void
    clearSubmittedText: (chatId: number, submittedText: string) => void
}

export const useChatInputTextStore = create<ChatInputTextStoreProps>()((set) => ({
    text: '',
    setText: (text) => set({ text }),
    clearSubmittedText: (chatId, submittedText) => {
        // Recheck after submission: the user may have switched chats or edited the draft.
        if (useChatState.getState().id !== chatId) return
        set((state) => (state.text === submittedText ? { text: '' } : state))
    },
}))
