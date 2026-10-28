import { create } from 'zustand'
import { persist } from 'zustand/middleware'

import { Storage } from '@lib/enums/Storage'
import { createMMKVStorage } from '@lib/storage/MMKV'

type GuideStore = {
    dismissed: Record<string, true>
    dismiss: (id: string) => void
    reset: (id?: string) => void
}

export const useGuideStore = create<GuideStore>()(
    persist(
        (set) => ({
            dismissed: {},
            dismiss: (id) => set((state) => ({ dismissed: { ...state.dismissed, [id]: true } })),
            reset: (id) =>
                set((state) => {
                    if (!id) return { dismissed: {} }
                    const dismissed = { ...state.dismissed }
                    delete dismissed[id]
                    return { dismissed }
                }),
        }),
        {
            name: Storage.Guides,
            storage: createMMKVStorage(),
            partialize: (state) => ({ dismissed: state.dismissed }),
        }
    )
)
