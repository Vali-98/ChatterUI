import * as DocumentPicker from 'expo-document-picker'
import * as FS from 'expo-file-system'

import { Global } from './GlobalValues'
import { Logger } from './Logger'
import { mmkv } from './MMKV'
import { SamplerID, SamplerPreset, Samplers } from './SamplerData'

export type SamplerField = keyof SamplerPreset

export namespace Presets {
    const presetdir = `${FS.documentDirectory}presets/`

    const getPresetDir = (name: string) => `${presetdir}${name}.json`

    export const defaultPreset = (Object.keys(Samplers) as SamplerID[])
        .map((key) => ({ id: key, value: Samplers[key].values.default }))
        .reduce((a, b) => (a = { ...a, [b.id]: b.value }), {}) as SamplerPreset

    export const fixPreset = (preset: any, presetname = '', fixmmkv = false) => {
        const existingKeys = Object.keys(preset)
        const defaultKeys = Object.keys(Samplers) as SamplerID[]
        let samekeys = true
        defaultKeys.map((key) => {
            if (key === SamplerID.SEED && typeof preset[key] === 'string')
                preset[key] = parseInt(preset[key])

            if (existingKeys.includes(key)) return
            const data = Samplers[key].values.default
            preset[key] = data
            samekeys = false
            Logger.log(`Preset was missing field: ${key}`)
        })
        if (presetname) saveFile(presetname, preset)
        if (fixmmkv) mmkv.set(Global.PresetData, JSON.stringify(preset))

        if (!samekeys) Logger.log(`Preset had missing fields and was fixed!`)
        return JSON.stringify(preset)
    }

    export const loadFile = async (name: string) => {
        return FS.readAsStringAsync(getPresetDir(name), {
            encoding: FS.EncodingType.UTF8,
        }).then((file) => {
            return fixPreset(JSON.parse(file), name)
        })
    }

    export const saveFile = async (name: string, preset: SamplerPreset) => {
        return FS.writeAsStringAsync(getPresetDir(name), JSON.stringify(preset), {
            encoding: FS.EncodingType.UTF8,
        })
    }

    export const deleteFile = async (name: string) => {
        return FS.deleteAsync(getPresetDir(name))
    }

    export const getFileList = async () => {
        return FS.readDirectoryAsync(presetdir)
    }

    export const uploadFile = async () => {
        return DocumentPicker.getDocumentAsync({ type: ['application/*'] }).then((result) => {
            if (
                result.canceled ||
                (!result.assets[0].name.endsWith('json') &&
                    !result.assets[0].name.endsWith('settings'))
            ) {
                Logger.log(`Invalid File Type!`, true)
                return
            }
            const name = result.assets[0].name.replace(`.json`, '').replace('.settings', '')
            return FS.copyAsync({
                from: result.assets[0].uri,
                to: getPresetDir(name),
            })
                .then(() => {
                    return FS.readAsStringAsync(getPresetDir(name), {
                        encoding: FS.EncodingType.UTF8,
                    })
                })
                .then(async (file) => {
                    await fixPreset(JSON.parse(file), name)
                    return name
                })
                .catch((error) => {
                    Logger.log(`Upload Failed: ${error.message}`, true)
                })
        })
    }
}
