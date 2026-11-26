import { createMMKV } from 'react-native-mmkv'
import { createJSONStorage, StateStorage } from 'zustand/middleware'

import { applyPendingRestore } from '@lib/backup/recovery'

import { migrateMMKVKeys } from './keyMigration'

// Imported by db.ts before opening SQLite and by stores before hydration.
export const mmkv = createMMKV()
migrateMMKVKeys(mmkv)
export const restoreResult = applyPendingRestore(mmkv)
if (restoreResult === 'restored') migrateMMKVKeys(mmkv)

export const mmkvStorage: StateStorage = {
    setItem: (name, value) => {
        return mmkv.set(name, value)
    },
    getItem: (name) => {
        const value = mmkv.getString(name)
        return value ?? null
    },
    removeItem: (name) => {
        return mmkv.remove(name)
    },
}

export const createMMKVStorage = () => {
    return createJSONStorage(() => mmkvStorage)
}
