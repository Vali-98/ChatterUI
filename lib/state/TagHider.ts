import { AppSettings } from '@lib/constants/GlobalValues'
import { PersistStore } from '@lib/storage/MMKV'
import { useMMKVBoolean } from 'react-native-mmkv'
import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { useShallow } from 'zustand/react/shallow'

interface TagHiderStoreProps {
    tags: string[]
    setTags: (newTags: string[]) => void
}

export namespace TagHider {
    export const store = create<TagHiderStoreProps>()(
        persist(
            (set) => ({
                tags: [],
                setTags: (newTags) => {
                    set({ tags: newTags })
                },
            }),
            PersistStore.create(PersistStore.TagHider, {
                version: 1,
                partialize: (data) => ({ tags: data.tags }),
            })
        )
    )

    export const useHiddenTags = () => {
        const [tagHider, _] = useMMKVBoolean(AppSettings.UseTagHider)
        const tags = TagHider.store(useShallow((state) => state.tags))
        if (!tagHider) return []
        return tags
    }
}
