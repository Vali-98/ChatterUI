import { Storage } from '@lib/enums/Storage'
import { createMMKVStorage } from '@lib/storage/MMKV'
import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { useShallow } from 'zustand/react/shallow'

export type SearchOrder = 'asc' | 'desc'
export type SearchType = 'name' | 'modified'

type CharacterListSorterProps = {
    showSearch: boolean
    searchOrder: SearchOrder
    searchType: SearchType
    setShowSearch: (b: boolean) => void
    tagFilter: string[]
    textFilter: string
    setOrder: (order: SearchOrder) => void
    setType: (type: SearchType) => void
    setTextFilter: (value: string) => void
    setTagFilter: (filter: string[]) => void
}

export namespace CharacterSorter {
    export const useSorterStore = create<CharacterListSorterProps>()(
        persist(
            (set) => ({
                showSearch: false,
                searchType: 'modified',
                searchOrder: 'desc',
                textFilter: '',
                tagFilter: [],
                setShowSearch: (b) => {
                    if (b) set((state) => ({ ...state, showSearch: b }))
                    else
                        set({
                            showSearch: b,
                            textFilter: '',
                            tagFilter: [],
                        })
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
                setOrder: (order) => set({ searchOrder: order }),
                setType: (type) => set({ searchType: type }),
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

    export const useSorter = () => {
        const {
            showSearch,
            setShowSearch,
            searchType,
            setSearchType,
            searchOrder,
            setSearchOrder,
            textFilter,
            setTextFilter,
            tagFilter,
            setTagFilter,
        } = useSorterStore(
            useShallow((state) => ({
                showSearch: state.showSearch,
                setShowSearch: state.setShowSearch,
                searchType: state.searchType,
                setSearchType: state.setType,
                searchOrder: state.searchOrder,
                setSearchOrder: state.setOrder,
                textFilter: state.textFilter,
                setTextFilter: state.setTextFilter,
                tagFilter: state.tagFilter,
                setTagFilter: state.setTagFilter,
            }))
        )

        return {
            showSearch,
            setShowSearch,
            searchType,
            setSearchType,
            searchOrder,
            setSearchOrder,
            textFilter,
            setTextFilter,
            tagFilter,
            setTagFilter,
        }
    }
}
