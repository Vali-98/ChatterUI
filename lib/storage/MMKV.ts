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

export const createMMKVStorage = () => {
    return createJSONStorage(() => mmkvStorage)
}
