import type { SQLiteDatabase } from 'expo-sqlite'
import { AppDirectory, tokenizerFilename } from '@lib/constants/directories'
import { Storage } from '@lib/constants/storageKeys'

import type { Preferences } from './preferences'

const excludedKeys = [Storage.Downloads, Storage.KV, Storage.Logs]
const storageOverrides: Partial<
    Record<Storage, (value: string, includeApiKeys: boolean) => string>
> = {
    [Storage.API]: (value, includeApiKeys) => {
        if (includeApiKeys) return value
        const envelope = JSON.parse(value)
        for (const connection of envelope.state.connections ?? []) connection.key = ''
        return JSON.stringify(envelope)
    },
    [Storage.TTS]: (value) => {
        const envelope = JSON.parse(value)
        delete envelope.state.voice
        return JSON.stringify(envelope)
    },
    [Storage.EngineData]: (value) => {
        const envelope = JSON.parse(value)
        delete envelope.state.lastModel
        if (envelope.state.config) envelope.state.config.devices = []
        return JSON.stringify(envelope)
    },
}

// Include other preferences unchanged. Overrides remove credentials or device-specific state.
export const exportPreferences = (values: Preferences, includeApiKeys: boolean): Preferences => {
    const result = { ...values }
    for (const key of excludedKeys) delete result[key]
    for (const [key, transform] of Object.entries(storageOverrides)) {
        const value = result[key]
        if (typeof value === 'string') result[key] = transform(value, includeApiKeys)
    }
    return result
}

// Only modify backup/staging databases. Model files are rediscovered on the destination.
export const excludeModelData = (database: Pick<SQLiteDatabase, 'execAsync'>) =>
    database.execAsync(`
        DELETE FROM model_mmproj_links;
        DELETE FROM characterLinks WHERE type = 'model_id';
        DELETE FROM model_data;
    `)

export const excludedMediaFiles = new Set([`${AppDirectory.Assets}${tokenizerFilename}`])
