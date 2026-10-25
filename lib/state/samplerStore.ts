import { getDocumentAsync } from 'expo-document-picker'
import { t } from 'i18next'
import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { useShallow } from 'zustand/react/shallow'

import {
    defaultSamplerConfig,
    SamplerConfigData,
    SamplerID,
    Samplers,
} from '@lib/constants/SamplerData'
import { Storage } from '@lib/enums/Storage'
import { Logger } from '@lib/state/Logger'
import { createMMKVStorage } from '@lib/storage/MMKV'
import { readStringAsync } from '@lib/utils/File'

import { CharacterLink } from './CharacterLinks'

export type SamplerConfig = {
    id: number
    name: string
    data: SamplerConfigData
}

type SamplerStore = {
    currentConfigId: number
    nextConfigId: number
    configList: SamplerConfig[]
    updateCurrentConfig: (preset: SamplerConfig) => void
    addSamplerConfig: (preset: Omit<SamplerConfig, 'id'>) => number | undefined
    deleteSamplerConfig: (id: number) => Promise<void>
    setCurrentConfig: (id: number) => void
    fixConfigs: () => void
}

type PersistedSamplerStore = Pick<SamplerStore, 'configList' | 'currentConfigId' | 'nextConfigId'>
type LegacySamplerStore = {
    configList: Omit<SamplerConfig, 'id'>[]
    currentConfigIndex: number
}

export const migrateSamplerStore = (persistedState: unknown, version: number) => {
    let state = persistedState
    // Version 2 replaces array positions with stable IDs, matching the SQLite
    // character-link migration's legacy index + 1 mapping.
    if (version < 2) {
        const legacy = state as LegacySamplerStore
        const configList = legacy.configList.map((config, index) => ({ ...config, id: index + 1 }))
        if (configList.length === 0) {
            configList.push({ id: 1, name: 'Default', data: { ...defaultSamplerConfig } })
        }
        state = {
            configList: configList,
            currentConfigId: configList[legacy.currentConfigIndex]?.id ?? configList[0].id,
            nextConfigId: configList.length + 1,
        }
    }
    return state as PersistedSamplerStore
}

export const useSamplerStore = create<SamplerStore>()(
    persist(
        (set, get) => ({
            currentConfigId: 1,
            nextConfigId: 2,
            configList: [{ id: 1, name: 'Default', data: { ...defaultSamplerConfig } }],
            addSamplerConfig: (config) => {
                if (get().configList.some((item) => item.name === config.name)) {
                    Logger.errorToast(t('sampler.toast.exists', { name: config.name }))
                    return
                }
                const id = get().nextConfigId
                const data = fixSamplerConfig({ ...config.data })
                set((state) => ({
                    configList: [...state.configList, { ...config, data, id }],
                    currentConfigId: id,
                    nextConfigId: id + 1,
                }))
                return id
            },
            deleteSamplerConfig: async (id) => {
                if (!get().configList.some((config) => config.id === id)) return
                if (get().configList.length === 1) {
                    Logger.errorToast(t('sampler.toast.lastconfig'))
                    return
                }
                await CharacterLink.db.mutate.deleteByValue('sampler_id', id)
                set((state) => {
                    const configList = state.configList.filter((config) => config.id !== id)
                    return {
                        configList: configList,
                        currentConfigId:
                            state.currentConfigId === id ? configList[0].id : state.currentConfigId,
                    }
                })
            },
            setCurrentConfig: (id) => {
                if (get().configList.some((config) => config.id === id)) {
                    set({ currentConfigId: id })
                }
            },
            updateCurrentConfig: (config) => {
                set((state) => ({
                    configList: state.configList.map((item) =>
                        item.id === state.currentConfigId ? { ...config, id: item.id } : item
                    ),
                }))
            },
            fixConfigs: () => {
                set((state) => ({
                    configList: state.configList.map((config) => ({
                        ...config,
                        data: fixSamplerConfig({ ...config.data }),
                    })),
                }))
            },
        }),
        {
            name: Storage.Samplers,
            storage: createMMKVStorage(),
            version: 2,
            partialize: (state) => ({
                configList: state.configList,
                currentConfigId: state.currentConfigId,
                nextConfigId: state.nextConfigId,
            }),
            migrate: migrateSamplerStore,
        }
    )
)

export const useSamplers = () => {
    const state = useSamplerStore(
        useShallow((state) => ({
            currentConfigId: state.currentConfigId,
            configList: state.configList,
            addSamplerConfig: state.addSamplerConfig,
            deleteSamplerConfig: state.deleteSamplerConfig,
            changeConfig: state.setCurrentConfig,
            updateCurrentConfig: state.updateCurrentConfig,
        }))
    )
    const currentConfig = state.configList.find((config) => config.id === state.currentConfigId)!
    return { ...state, currentConfig }
}

export function getCurrentSampler() {
    const { configList, currentConfigId } = useSamplerStore.getState()
    return configList.find((config) => config.id === currentConfigId)!.data
}

export function useCurrentSampler(): SamplerConfig | undefined {
    return useSamplerStore((state) =>
        state.configList.find((config) => config.id === state.currentConfigId)
    )
}

export async function importConfigFile(): Promise<Omit<SamplerConfig, 'id'> | undefined> {
    try {
        const result = await getDocumentAsync({ type: ['application/*'] })
        if (
            result.canceled ||
            (!result.assets[0].name.endsWith('json') && !result.assets[0].name.endsWith('settings'))
        ) {
            Logger.errorToast(t('common.errors.invalidFileType'))
            return
        }
        const {
            assets: [asset],
        } = result
        const name = asset.name.replace(`.json`, '').replace('.settings', '').replace(' ', '_')
        const data = await readStringAsync(asset.uri)

        return { data: JSON.parse(data), name: name }
    } catch (e) {
        Logger.errorToast(t('sampler.toast.failedToImport'), e)
    }
}

export function fixSamplerConfig(config: SamplerConfigData) {
    const existingKeys = Object.keys(config)
    const defaultKeys = Object.values(SamplerID) as SamplerID[]
    let samekeys = true
    defaultKeys.map((key) => {
        if (key === SamplerID.SEED && typeof config[key] === 'string')
            config[key] = parseInt(config[key])
        if (existingKeys.includes(key)) return
        const data = Samplers[key].values.default
        //@ts-expect-error needs more coercion, but probably fine
        config[key] = data
        samekeys = false
        Logger.debug(`Sampler Config was missing field: ${key}`)
    })
    if (!samekeys) Logger.warn(`Sampler Config had missing fields and was fixed!`)
    return config
}
