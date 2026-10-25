import type { StateCreator, StoreApi } from 'zustand'

import { createLiveQueryState, type LiveQueryStateBinding } from '@lib/state/createLiveQueryState'
import { Logger } from '@lib/state/Logger'

import { db } from './db'
import { getCardImageUri } from './images'
import type { CharacterCardSelectionState } from './types'

/** Character and user selections have identical behavior; persistence is configured separately. */
export const createCardSelection = () => {
    let liveQuery: LiveQueryStateBinding | undefined
    const initializer: StateCreator<CharacterCardSelectionState> = (set, get) => ({
        id: undefined,
        card: undefined,
        error: undefined,
        setCard: async (characterId) => {
            if (get().id === characterId) liveQuery?.refresh()
            else set({ id: characterId, card: undefined, error: undefined })
            const { card, error } = get()
            if (error) throw error
            return card?.name
        },
        unloadCard: () => set({ id: undefined, card: undefined, error: undefined }),
        getImageUri: () => getCardImageUri(get().card?.image_id ?? 0),
    })
    const bind = (state: StoreApi<CharacterCardSelectionState>) => {
        liveQuery?.dispose()
        liveQuery = createLiveQueryState(state, {
            select: (value) => value.id,
            query: db.live.card,
            watch: (id) => [
                { table: 'characters', rowId: id },
                // SQLite notifications contain rowids, not these relations' character_id.
                { table: 'character_greetings' },
                { table: 'character_tags' },
                { table: 'tags' },
                { table: 'characterLinks' },
            ],
            update: (snapshot, id) => {
                if (snapshot?.error) Logger.error(snapshot.error)
                const next = {
                    id:
                        snapshot?.error !== undefined || snapshot?.data !== undefined
                            ? id
                            : undefined,
                    card: snapshot?.data,
                    error: snapshot?.error,
                }
                const current = state.getState()
                if (
                    current.id !== next.id ||
                    current.card !== next.card ||
                    current.error !== next.error
                ) {
                    state.setState(next)
                }
            },
        })
    }
    return { initializer, bind }
}
