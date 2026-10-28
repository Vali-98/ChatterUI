import type { View } from 'react-native'
import type { AnimatedRef } from 'react-native-reanimated'
import { create } from 'zustand'

import {
    guides,
    isGuideEligible,
    type GuideContext,
    type GuideId,
    type GuideTargetId,
} from './definitions'
import { useGuideStore } from './store'

type ActiveGuide = { id: GuideId; step: number }
type GuideState = {
    active?: ActiveGuide
    forced: GuideId[]
    targets: Partial<Record<GuideTargetId, AnimatedRef<View>>>
    register: (id: GuideTargetId, ref: AnimatedRef<View>) => void
    unregister: (id: GuideTargetId, ref: AnimatedRef<View>) => void
    start: (id: GuideId, context: GuideContext) => void
    next: () => void
    back: () => void
    skip: () => void
    stop: (id: GuideId) => void
    replay: (ids: GuideId[]) => void
}

export const useGuideState = create<GuideState>((set, get) => ({
    active: undefined,
    forced: [],
    targets: {},
    register: (id, ref) => set((state) => ({ targets: { ...state.targets, [id]: ref } })),
    unregister: (id, ref) =>
        set((state) => {
            if (state.targets[id] !== ref) return state
            const targets = { ...state.targets }
            delete targets[id]
            return { targets }
        }),
    start: (id, context) => {
        const state = get()
        if (state.active) return
        const forced = state.forced.includes(id)
        if (!forced && (!isGuideEligible(id, context) || useGuideStore.getState().dismissed[id]))
            return
        if (!context.onboardingComplete) return
        set({ active: { id, step: 0 }, forced: state.forced.filter((item) => item !== id) })
    },
    next: () => {
        const active = get().active
        if (!active) return
        if (active.step + 1 === guides[active.id].steps.length) {
            useGuideStore.getState().dismiss(active.id)
            set({ active: undefined })
        } else set({ active: { ...active, step: active.step + 1 } })
    },
    back: () => {
        const active = get().active
        if (active && active.step > 0) set({ active: { ...active, step: active.step - 1 } })
    },
    skip: () => {
        const active = get().active
        if (!active) return
        useGuideStore.getState().dismiss(active.id)
        set({ active: undefined })
    },
    stop: (id) => {
        if (get().active?.id === id) set({ active: undefined })
    },
    replay: (ids) => set({ active: undefined, forced: ids }),
}))
