import { create } from 'zustand'

export type TTSSource = {
    kind: 'live' | 'completion' | 'manual' | 'preview'
    chatId?: number
    messageId?: number
    swipeId?: number
    generationId?: number
    name?: string
}
export type TTSSession = TTSSource & {
    id: number
    status: 'waiting' | 'speaking' | 'finished' | 'failed'
    sourceFinished: boolean
    queuedChunks: number
    spokenCharacters: number
    error?: string
}
export const useTTSState = create<{ session?: TTSSession }>(() => ({}))
export const isTTSActive = (session?: TTSSession) =>
    session?.status === 'waiting' || session?.status === 'speaking'
export const updateTTSSession = (id: number, changes: Partial<Omit<TTSSession, 'id'>>) => {
    useTTSState.setState((state) => {
        if (state.session?.id !== id) return state
        if (
            Object.entries(changes).every(([key, value]) =>
                Object.is(state.session![key as keyof TTSSession], value)
            )
        )
            return state
        return { session: { ...state.session, ...changes } }
    })
}
