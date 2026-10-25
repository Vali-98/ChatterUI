import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { useShallow } from 'zustand/react/shallow'

import { Storage } from '@lib/enums/Storage'
import { CharacterLink } from '@lib/state/CharacterLinks'
import { Logger } from '@lib/state/Logger'
import { createMMKVStorage } from '@lib/storage/MMKV'

import { APIConfiguration, APIValues } from './APIBuilder.types'
import { defaultTemplates } from './DefaultAPI'

export interface Connection extends APIValues {
    id: number
    friendlyName: string
}

type ConnectionPreferences = {
    showCustomFields: boolean
}

type ConnectionStore = {
    connections: Connection[]
    activeConnectionId: number | null
    nextConnectionId: number
    preferences: ConnectionPreferences
    customTemplates: APIConfiguration[]
    updatePreferences: (preferences: Partial<ConnectionPreferences>) => void
    addConnection: (connection: Omit<Connection, 'id'>) => number
    updateConnection: (id: number, connection: Omit<Connection, 'id'>) => void
    removeConnection: (id: number) => Promise<void>
    setActiveConnection: (id: number | null) => void
    addTemplate: (template: APIConfiguration) => void
    removeTemplate: (name: string) => void
    getTemplates: () => APIConfiguration[]
}

type LegacyConnection = APIValues & { active: boolean; friendlyName: string }
type LegacyConnectionStore = {
    values: LegacyConnection[]
    activeIndex: number
    preferences?: ConnectionPreferences
    customTemplates: APIConfiguration[]
}

type PersistedConnectionStore = Pick<
    ConnectionStore,
    'connections' | 'activeConnectionId' | 'nextConnectionId' | 'preferences' | 'customTemplates'
>

// Keep the original MMKV key so existing installations hydrate and migrate in place.
export const migrateConnectionStore = (persistedState: unknown, version: number) => {
    let state = persistedState

    // Version 2 introduced connection preferences.
    if (version < 2) {
        const legacy = state as LegacyConnectionStore
        state = {
            ...legacy,
            preferences: legacy.preferences ?? { showCustomFields: false },
        }
    }

    // Version 3 replaced array indices with stable IDs. Initial IDs match the
    // legacy index + 1, including the SQLite character-link migration.
    if (version < 3) {
        const legacy = state as LegacyConnectionStore
        const connections = legacy.values.map(({ active: _active, ...connection }, index) => ({
            ...connection,
            id: index + 1,
        }))
        state = {
            connections: connections,
            activeConnectionId: connections[legacy.activeIndex]?.id ?? null,
            nextConnectionId: connections.length + 1,
            preferences: legacy.preferences,
            customTemplates: legacy.customTemplates,
        }
    }

    return state as PersistedConnectionStore
}

export const useConnectionStore = create<ConnectionStore>()(
    persist(
        (set, get) => ({
            connections: [],
            activeConnectionId: null,
            nextConnectionId: 1,
            preferences: { showCustomFields: false },
            customTemplates: [],
            updatePreferences: (preferences) =>
                set({ preferences: { ...get().preferences, ...preferences } }),
            addConnection: (connection) => {
                const id = get().nextConnectionId
                set((state) => ({
                    connections: [...state.connections, { ...connection, id }],
                    activeConnectionId: id,
                    nextConnectionId: id + 1,
                }))
                return id
            },
            updateConnection: (id, connection) => {
                set((state) => ({
                    connections: state.connections.map((item) =>
                        item.id === id ? { ...connection, id } : item
                    ),
                }))
            },
            removeConnection: async (id) => {
                if (!get().connections.some((connection) => connection.id === id)) return
                await CharacterLink.db.mutate.deleteByValue('connection_id', id)
                set((state) => ({
                    connections: state.connections.filter((connection) => connection.id !== id),
                    activeConnectionId:
                        state.activeConnectionId === id ? null : state.activeConnectionId,
                }))
            },
            setActiveConnection: (id) => {
                if (id !== null && !get().connections.some((connection) => connection.id === id))
                    return
                set({ activeConnectionId: id })
            },
            addTemplate: (template) => {
                const templates = get().getTemplates()
                const copy = JSON.parse(JSON.stringify(template)) as APIConfiguration
                if (templates.some((item) => item.name === copy.name)) {
                    copy.name = generateUniqueName(
                        copy.name,
                        templates.map((item) => item.name)
                    )
                    Logger.info(`Name exists, renaming to: ${copy.name}`)
                }
                const output = verifyJSON(copy, defaultTemplates[0])
                set((state) => ({ customTemplates: [...state.customTemplates, output] }))
            },
            removeTemplate: (name) => {
                set((state) => ({
                    customTemplates: state.customTemplates.filter(
                        (template) => template.name !== name
                    ),
                }))
            },
            getTemplates: () => [...defaultTemplates, ...get().customTemplates],
        }),
        {
            name: Storage.API,
            storage: createMMKVStorage(),
            version: 3,
            migrate: migrateConnectionStore,
            partialize: (state) => ({
                connections: state.connections,
                activeConnectionId: state.activeConnectionId,
                nextConnectionId: state.nextConnectionId,
                preferences: state.preferences,
                customTemplates: state.customTemplates,
            }),
        }
    )
)

export function useActiveConnectionTemplate() {
    const { activeConnectionId, connections, customTemplates } = useConnectionStore(
        useShallow((store) => ({
            activeConnectionId: store.activeConnectionId,
            connections: store.connections,
            customTemplates: store.customTemplates,
        }))
    )
    const apiValue = connections.find((connection) => connection.id === activeConnectionId)
    const apiConfig = [...defaultTemplates, ...customTemplates].find(
        (template) => template.name === apiValue?.configName
    )
    return { apiValue, apiConfig }
}

// recursively fill json in case it is incorrect
const verifyJSON = (source: any, target: any): any => {
    const fillFields = (sourceObj: any, targetObj: any): any => {
        if (typeof sourceObj !== 'object' || sourceObj === null) {
            sourceObj = Array.isArray(targetObj) ? [] : {}
        }
        for (const key of Object.keys(targetObj)) {
            if (key === 'samplerFields') continue
            if (!(key in sourceObj)) {
                sourceObj[key] = targetObj[key]
            } else if (typeof targetObj[key] === 'object' && targetObj[key] !== null) {
                sourceObj[key] = fillFields(sourceObj[key], targetObj[key])
            }
        }
        return sourceObj
    }
    return fillFields(source, target)
}

function generateUniqueName(baseName: string, names: string[]) {
    const regex = new RegExp(`^${baseName}\\s\\((\\d+)\\)$`)
    const existingNumbers = names
        .map((item) => {
            const match = item.match(regex)
            return match ? parseInt(match[1], 10) : null
        })
        .filter((num) => num !== null)
    const nextNumber = existingNumbers.length > 0 ? Math.max(...existingNumbers) + 1 : 1
    return `${baseName} (${nextNumber})`
}
