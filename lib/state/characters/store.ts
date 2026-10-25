import { create } from 'zustand'
import { persist } from 'zustand/middleware'

import { Storage } from '@lib/enums/Storage'
import { Logger } from '@lib/state/Logger'
import { createMMKVStorage } from '@lib/storage/MMKV'

import { db } from './db'
import { getImageDir } from './images'
import type { CharacterCardData, CharacterCardState } from './types'

export const useUserStore = create<CharacterCardState>()(
    persist(
        (set, get) => ({
            id: undefined,
            card: undefined,
            setCard: async (id: number) => {
                const card = await db.query.card(id)
                if (card) set({ card: card, id: id })
                return card?.name
            },
            unloadCard: () => {
                set({
                    id: undefined,
                    card: undefined,
                })
            },
            updateCard: (card: CharacterCardData) => {
                set({ card })
            },
            getImage: () => {
                return getImageDir(get().card?.image_id ?? 0)
            },
        }),
        {
            name: Storage.UserCard,
            storage: createMMKVStorage(),
            version: 2,
            partialize: (state) => ({ id: state.id, card: state.card }),
            migrate: async (persistedState: any, version) => {
                if (version === 1) {
                    // migration from CharacterCardV2 to CharacterCardData
                    Logger.info('Migrating User Store to v2')
                    persistedState.id = undefined
                    persistedState.card = undefined
                }
                return persistedState
            },
        }
    )
)
