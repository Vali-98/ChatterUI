import { create } from 'zustand'

export type ContextStats = {
    total: number
    capacity: number
    response: number
    system: number
    history: number
    summaries: number
    dataSources: number
    summarizedMessages: number
    rawHistory: number
}
export const useContextStatsState = create<{
    chats: Record<number, ContextStats>
    lastChatId?: number
}>(() => ({ chats: {} }))
export const recordContextStats = (chatId: number, stats: ContextStats) =>
    useContextStatsState.setState((state) => ({
        chats: { ...state.chats, [chatId]: stats },
        lastChatId: chatId,
    }))
