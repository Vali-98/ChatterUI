import { create } from 'zustand'

import { db } from './db'
import { getImageDir } from './images'
import type { CharacterCardData, CharacterCardState } from './types'

export const useCharacterState = create<CharacterCardState>()((set, get) => ({
    id: undefined,
    card: undefined,
    setCard: async (id: number) => {
        const card = await db.query.card(id)
        set({ card: card, id: id })
        return card?.name
    },
    updateCard: (card: CharacterCardData) => {
        set({ card })
    },
    unloadCard: () => {
        set({
            id: undefined,
            card: undefined,
        })
    },
    getImage: () => {
        return getImageDir(get().card?.image_id ?? 0)
    },
}))
