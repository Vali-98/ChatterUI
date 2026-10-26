import { create } from 'zustand'

// Chat owns mutation access; inference is one caller, not a dependency of this feature.
export type ChatMutationOptions = { mutationToken?: symbol }
export const useChatAccessState = create<{ leases: Record<number, symbol> }>(() => ({ leases: {} }))

export const acquireChatLease = (chatId: number) => {
    assertChatEditable(chatId)
    const token = Symbol('chat-mutation-lease')
    useChatAccessState.setState((state) => ({ leases: { ...state.leases, [chatId]: token } }))
    return token
}
export const releaseChatLease = (chatId: number, token: symbol) => {
    useChatAccessState.setState((state) => {
        if (state.leases[chatId] !== token) return state
        const leases = { ...state.leases }
        delete leases[chatId]
        return { leases }
    })
}
export const assertChatEditable = (chatId: number, options: ChatMutationOptions = {}) => {
    const owner = useChatAccessState.getState().leases[chatId]
    if (owner !== undefined && owner !== options.mutationToken)
        throw new Error('Chat is busy generating')
}
export const useChatEditable = (chatId: number) =>
    useChatAccessState((state) => state.leases[chatId] === undefined)
