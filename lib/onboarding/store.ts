import { create } from 'zustand'
import { persist } from 'zustand/middleware'

import { Storage } from '@lib/constants/storageKeys'
import { onboardingGuideIds } from '@lib/guides/definitions'
import { useGuideState } from '@lib/guides/state'
import { Characters } from '@lib/state/characters'
import { createMMKVStorage } from '@lib/storage/MMKV'

type OnboardingStore = {
    status?: 'inProgress' | 'complete'
    origin?: 'fresh' | 'legacy'
    step: number
    connectionId?: number
    setStep: (step: number) => void
    setConnectionId: (id: number) => void
    restart: () => void
    complete: () => void
}

export const useOnboardingStore = create<OnboardingStore>()(
    persist(
        (set) => ({
            status: undefined,
            step: 0,
            setStep: (step) => set({ step }),
            setConnectionId: (connectionId) => set({ connectionId }),
            restart: () => {
                useGuideState.getState().replay(onboardingGuideIds)
                set({ status: 'inProgress', step: 0, connectionId: undefined })
            },
            complete: () => set({ status: 'complete' }),
        }),
        {
            name: Storage.Onboarding,
            storage: createMMKVStorage(),
            partialize: (state) => ({
                status: state.status,
                origin: state.origin,
                step: state.step,
                connectionId: state.connectionId,
            }),
        }
    )
)

// Run before startup creates default users/cards, so fresh installs stay distinguishable.
export const prepareOnboarding = async () => {
    const state = useOnboardingStore.getState()
    if (state.status) {
        // Older installs with no origin should not suddenly receive the basic tutorials.
        if (!state.origin)
            useOnboardingStore.setState({
                origin: state.status === 'inProgress' ? 'fresh' : 'legacy',
            })
        return
    }
    const cards = await Characters.db.query.cardList()
    const users = await Characters.db.query.cardList({ type: 'user' })
    const legacy = cards.length > 0 || users.length > 0
    useOnboardingStore.setState({
        status: legacy ? 'complete' : 'inProgress',
        origin: legacy ? 'legacy' : 'fresh',
    })
}
