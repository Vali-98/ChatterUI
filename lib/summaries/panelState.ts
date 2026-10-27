import { create } from 'zustand'

export const useSummaryPanelState = create<{
    chatId?: number
    summaryId?: number
    open: (chatId: number, summaryId?: number) => void
    select: (summaryId?: number) => void
    close: () => void
}>((set) => ({
    open: (chatId, summaryId) => set({ chatId, summaryId }),
    select: (summaryId) => set({ summaryId }),
    close: () => set({ chatId: undefined, summaryId: undefined }),
}))
