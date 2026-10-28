import { create } from 'zustand'

// Shared between the character-list and chat hosts; never persisted with downloads.
export const useDownloadNoticeState = create<{
    collapsedFor?: string
    collapse: (downloads: string) => void
    expand: () => void
}>((set) => ({
    collapsedFor: undefined,
    collapse: (collapsedFor) => set({ collapsedFor }),
    expand: () => set({ collapsedFor: undefined }),
}))
