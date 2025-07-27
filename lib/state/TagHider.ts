import { AppSettings } from '@lib/constants/GlobalValues'
import { Storage } from '@lib/enums/Storage'
import { createMMKVStorage } from '@lib/storage/MMKV'
import { useMMKVBoolean } from 'react-native-mmkv'
import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { useShallow } from 'zustand/react/shallow'

interface TagHiderStoreProps {
    tags: string[]
    setTags: (newTags: string[]) => void
}

export namespace TagHider {
    export const useTagHiderStore = create<TagHiderStoreProps>()(
        persist(
            (set) => ({
                tags: [],
                setTags: (newTags) => {
                    set({ tags: newTags })
                },
            }),
            {
                name: Storage.TagHider,
                storage: createMMKVStorage(),
                version: 1,
                partialize: (data) => ({ tags: data.tags }),
            }
        )
    )

    export const useHiddenTags = () => {
        const [tagHider, _] = useMMKVBoolean(AppSettings.UseTagHider)
        const tags = TagHider.useTagHiderStore(useShallow((state) => state.tags))
        if (!tagHider) return []
        return tags
    }
}
