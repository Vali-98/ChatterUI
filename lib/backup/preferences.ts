import type { MMKV } from 'react-native-mmkv'
import { z } from 'zod'

export const preferencesSchema = z.record(z.string(), z.union([z.string(), z.boolean()]))
export type Preferences = z.infer<typeof preferencesSchema>
export type PreferenceStorage = Pick<
    MMKV,
    'getAllKeys' | 'getString' | 'getBoolean' | 'set' | 'clearAll'
>

// Settings and data-migration flags are booleans. Persisted stores are JSON strings.
export const readPreferences = (storage: PreferenceStorage): Preferences => {
    const result: Preferences = Object.create(null)
    for (const key of storage.getAllKeys()) {
        const value =
            key.startsWith('settings-') || key.startsWith('migration.')
                ? storage.getBoolean(key)
                : storage.getString(key)
        if (value === undefined) throw new Error(`Cannot read preference: ${key}`)
        result[key] = value
    }
    return result
}
export const writePreferences = (storage: PreferenceStorage, values: Preferences) => {
    storage.clearAll()
    for (const [key, value] of Object.entries(values)) storage.set(key, value)
}
