import { create } from 'zustand'
import { persist } from 'zustand/middleware'

import { Storage } from '@lib/enums/Storage'
import { createMMKVStorage } from '@lib/storage/MMKV'

import type { CharacterSortBy, CharacterSortDirection } from './types'

// searchType/searchOrder are persisted keys; preserve their spelling for compatibility.
type CharacterSortStore = {
    showSearch: boolean
    searchOrder: CharacterSortDirection
    searchType: CharacterSortBy
    setShowSearch: (showSearch: boolean) => void
    tagFilter: string[]
    textFilter: string
    setSortDirection: (direction: CharacterSortDirection) => void
    setSortBy: (sortBy: CharacterSortBy) => void
    setTextFilter: (value: string) => void
    setTagFilter: (filter: string[]) => void
}

export const useCharacterSortStore = create<CharacterSortStore>()(
    persist(
        (set, get) => ({
            showSearch: false,
            searchType: 'modified',
            searchOrder: 'desc',
            textFilter: '',
            tagFilter: [],
            setShowSearch: (showSearch) => {
                set({ showSearch })
                if (get().tagFilter.length > 0) set({ tagFilter: [] })
                if (get().textFilter) set({ textFilter: '' })
            },

            setTextFilter: (textFilter: string) => {
                set({
                    textFilter: textFilter,
                })
            },
            setTagFilter: (tagFilter: string[]) => {
                set({
                    tagFilter: tagFilter,
                })
            },
            setSortDirection: (direction) => set({ searchOrder: direction }),
            setSortBy: (sortBy) => set({ searchType: sortBy }),
        }),
        {
            name: Storage.CharacterSearch,
            storage: createMMKVStorage(),
            version: 1,
            partialize: (item) => ({
                searchType: item.searchType,
                searchOrder: item.searchOrder,
            }),
        }
    )
)
