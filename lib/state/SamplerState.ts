import {
    defaultSamplerConfig,
    SamplerConfigData,
    SamplerID,
    Samplers,
} from '@lib/constants/SamplerData'
import { Storage } from '@lib/enums/Storage'
import { Logger } from '@lib/state/Logger'
import { mmkvStorage } from '@lib/storage/MMKV'
import { getDocumentAsync } from 'expo-document-picker'
import { EncodingType, readAsStringAsync } from 'expo-file-system'
import { create } from 'zustand'
import { createJSONStorage, persist } from 'zustand/middleware'

export type SamplerConfig = {
    name: string
    data: SamplerConfigData
}

export type SamplerStateProps = {
    currentConfigIndex: number
    configList: SamplerConfig[]
    updateCurrentConfig: (preset: SamplerConfig) => void
    addSamplerConfig: (preset: SamplerConfig) => void
    deleteSamplerConfig: (index: number) => void
    setConfig: (index: number) => void
    fixConfigs: () => void
}

export namespace SamplersManager {
    export const useSamplerState = create<SamplerStateProps>()(
        persist(
            (set, get) => ({
                currentConfigIndex: 0,
                configList: [{ name: 'Default', data: defaultSamplerConfig }],
                addSamplerConfig: (config) => {
                    const configs = get().configList
                    if (configs.some((item) => item.name === config.name)) {
                        Logger.errorToast(`Sampler Config "${config.name}" already exists!`)
                        return
                    }
                    config.data = fixSamplerConfig(config.data)
                    set((state) => ({
                        ...state,
                        configList: [...state.configList, config],
                        currentConfigIndex: state.configList.length,
                    }))
                },
                deleteSamplerConfig: (index) => {
                    set((state) => ({
                        ...state,
                        configList: state.configList.filter((item, i) => i !== index),
                        currentConfigIndex:
                            index === state.currentConfigIndex ? 0 : state.currentConfigIndex,
                    }))
                },
                setConfig: (index) => {
                    const maxLength = get().configList.length
                    if (index >= maxLength || index < 0) {
                        return
                    }

                    set((state) => ({
                        ...state,
                        currentConfigIndex: index,
                    }))
                },
                updateCurrentConfig: (config) => {
                    const configs = get().configList
                    const index = get().currentConfigIndex
                    configs[index] = config
                    set((state) => ({
                        ...state,
                        configList: configs,
                    }))
                },
                fixConfigs: () => {
                    set((state) => ({
                        ...state,
                        configList: state.configList.map((item) => ({
                            name: item.name,
                            data: fixSamplerConfig(item.data),
                        })),
                    }))
                },
            }),
            {
                name: Storage.Samplers,
                storage: createJSONStorage(() => mmkvStorage),
                version: 1,
                partialize: (state) => ({
                    configList: state.configList,
                    currentConfigIndex: state.currentConfigIndex,
                }),
                migrate: async (persistedState: any, version) => {
                    //no migrations yet
                },
            }
        )
    )

    export const useSamplers = () => {
        const {
            currentPresetIndex: currentConfigIndex,
            samplerConfigs,
            addSamplerConfig,
            deleteSamplerConfig,
            changeConfig,
            updateCurrentConfig,
            configList,
        } = useSamplerState((state) => ({
            currentPresetIndex: state.currentConfigIndex,
            samplerConfigs: state.configList,
            addSamplerConfig: state.addSamplerConfig,
            deleteSamplerConfig: state.deleteSamplerConfig,
            changeConfig: state.setConfig,
            updateCurrentConfig: state.updateCurrentConfig,
            configList: state.configList,
        }))

        const currentConfig = samplerConfigs[currentConfigIndex]

        return {
            currentConfigIndex,
            addSamplerConfig,
            deleteSamplerConfig,
            changeConfig,
            updateCurrentConfig,
            currentConfig,
            configList,
        }
    }

    export const getCurrentSampler = () => {
        return useSamplerState.getState().configList[useSamplerState.getState().currentConfigIndex]
            .data
    }

    export const importConfigFile = async (): Promise<SamplerConfig | undefined> => {
        try {
            const result = await getDocumentAsync({ type: ['application/*'] })
            if (
                result.canceled ||
                (!result.assets[0].name.endsWith('json') &&
                    !result.assets[0].name.endsWith('settings'))
            ) {
                Logger.errorToast(`Invalid File Type!`)
                return
            }
            const name = result.assets[0].name
                .replace(`.json`, '')
                .replace('.settings', '')
                .replace(' ', '_')
            const data = await readAsStringAsync(result.assets[0].uri, {
                encoding: EncodingType.UTF8,
            })
            return { data: JSON.parse(data), name: name }
        } catch (e) {
            Logger.errorToast(`Failed to import: ${e}`)
        }
    }
}

export const fixSamplerConfig = (config: SamplerConfigData) => {
    const existingKeys = Object.keys(config)
    const defaultKeys = Object.values(SamplerID) as SamplerID[]
    let samekeys = true
    defaultKeys.map((key) => {
        if (key === SamplerID.SEED && typeof config[key] === 'string')
            config[key] = parseInt(config[key])
        if (existingKeys.includes(key)) return
        const data = Samplers[key].values.default
        config[key] = data
        samekeys = false
        Logger.debug(`Sampler Config was missing field: ${key}`)
    })
    if (!samekeys) Logger.warn(`Sampler Config had missing fields and was fixed!`)
    return config
}
