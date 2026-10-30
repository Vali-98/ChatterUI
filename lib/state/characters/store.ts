import { create } from 'zustand'
import { persist } from 'zustand/middleware'

import { Storage } from '@lib/constants/storageKeys'
import { createMMKVStorage } from '@lib/storage/MMKV'

import { createCardSelection } from './selection'
import type { CharacterCardSelectionState } from './types'

type UserSelection = { id?: number }

const readSelection = (persisted: unknown): UserSelection => {
    const id = (persisted as UserSelection | undefined)?.id
    return { id: typeof id === 'number' && Number.isInteger(id) ? id : undefined }
}

const selection = createCardSelection()
export const useUserStore = create<CharacterCardSelectionState>()(
    persist(selection.initializer, {
        name: Storage.UserCard,
        storage: createMMKVStorage(),
        version: 3,
        // The database must be migrated before restoring a live query.
        skipHydration: true,
        partialize: (state): UserSelection => ({ id: state.id }),
        migrate: (persisted: unknown, version): UserSelection => {
            // v1 contained the older portable-card format; retain its existing reset behavior.
            if (version === 1) return { id: undefined }
            // v2 -> v3: retain selection, discard the persisted record snapshot.
            return readSelection(persisted)
        },
        // Never hydrate a card/error from storage, including manual restore or old backups.
        merge: (persisted, current) => {
            const { id } = readSelection(persisted)
            return {
                ...current,
                id: id,
                card: id === current.id ? current.card : undefined,
                error: id === current.id ? current.error : undefined,
            }
        },
    })
)
selection.bind(useUserStore)
