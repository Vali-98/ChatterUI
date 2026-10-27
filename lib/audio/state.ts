import { create } from 'zustand'

export type AudioSource = {
    uri: string
    name: string
    chatId: number
    messageId?: number
}
export type AudioSession = AudioSource & {
    id: number
    status: 'loading' | 'playing' | 'paused' | 'finished' | 'failed'
    currentTime: number
    duration: number
    error?: string
}
export const useAudioState = create<{ session?: AudioSession; recording: boolean }>(() => ({
    recording: false,
}))
export const isAudioActive = (session?: AudioSession) =>
    session !== undefined && !['finished', 'failed'].includes(session.status)
