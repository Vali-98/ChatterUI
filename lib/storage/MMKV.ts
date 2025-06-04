import { MMKV } from 'react-native-mmkv'
import { createJSONStorage, StateStorage } from 'zustand/middleware'

export const mmkv = new MMKV()

export const mmkvStorage: StateStorage = {
    setItem: (name, value) => {
        return mmkv.set(name, value)
    },
    getItem: (name) => {
        const value = mmkv.getString(name)
        return value ?? null
    },
    removeItem: (name) => {
        return mmkv.delete(name)
    },
}

export enum PersistStore {
    TagHider = 'tag-hider-storage',
}

export namespace PersistStore {
    /**
     * Create a persist config object for zustand-persist
     * @param name key from PersistStore enum
     * @param options extra options to merge, e.g. partialize, version overrides
     */
    export function create<T>(
        name: PersistStore,
        options: Partial<{
            partialize: (state: T) => Partial<T>
            version: number
        }> = {}
    ) {
        return {
            name,
            storage: createJSONStorage(() => mmkvStorage),
            partialize: options?.partialize ?? ((state: T) => state),
            ...options,
        }
    }
}
