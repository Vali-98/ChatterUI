import * as DocumentPicker from 'expo-document-picker'
import * as FS from 'expo-file-system'

import { Global } from './GlobalValues'
import { Logger } from './Logger'
import { mmkv } from './MMKV'
import { SamplerID, SamplerPreset, Samplers } from './SamplerData'
/*
export type SamplerPreset = {
    temp: number
    top_p: number
    top_k: number
    top_a: number
    // merged from KAI

    min_p: number
    single_line: boolean
    sampler_order: number[]
    seed: number

    //
    tfs: number
    epsilon_cutoff: number
    eta_cutoff: number
    typical: number
    rep_pen: number
    rep_pen_range: number
    rep_pen_slope: number
    no_repeat_ngram_size: number
    penalty_alpha: number
    num_beams: number
    length_penalty: number
    min_length: number
    encoder_rep_pen: number
    freq_pen: number
    presence_pen: number
    do_sample: boolean
    early_stopping: boolean
    add_bos_token: boolean
    truncation_length: number
    ban_eos_token: boolean
    skip_special_tokens: boolean
    streaming: boolean
    mirostat_mode: number
    mirostat_tau: number
    mirostat_eta: number
    guidance_scale: number
    negative_prompt: string
    grammar_string: string
    banned_tokens: string
    rep_pen_size: number
    genamt: number
    max_length: number

    dynatemp_range: number
    smoothing_factor: number

    dry_multiplier: number
    dry_base: number
    dry_allowed_length: number
    dry_sequence_break: string
}*/

/*temp: 1,
        top_p: 1,
        top_k: 40,
        top_a: 0,
        // merged from KAI

        min_p: 0.0,
        single_line: false,
        //sampler_order: [6, 0, 1, 3, 4, 2, 5],
        seed: -1,

        //
        tfs: 1,
        epsilon_cutoff: 0,
        eta_cutoff: 0,
        typical: 1,
        rep_pen: 1,
        rep_pen_range: 0,
        rep_pen_slope: 1,
        no_repeat_ngram_size: 20,
        penalty_alpha: 0,
        num_beams: 1,
        length_penalty: 1,
        min_length: 0,
        encoder_rep_pen: 1,
        freq_pen: 0,
        presence_pen: 0,
        do_sample: true,
        early_stopping: false,
        add_bos_token: true,
        //truncation_length: 2048,
        ban_eos_token: false,
        skip_special_tokens: true,
        streaming: true,
        mirostat_mode: 0,
        mirostat_tau: 5,
        mirostat_eta: 0.1,
        guidance_scale: 1,
        negative_prompt: '',
        grammar_string: '',
        banned_tokens: '',
        ///rep_pen_size: 0,
        genamt: 256,
        max_length: 4096,

        dynatemp_range: 0,
        smoothing_factor: 0,

        dry_multiplier: 0,
        dry_base: 0,
        dry_allowed_length: 0,
        dry_sequence_break: '',*/

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
            Logger.log(`Prese was missing field ${key}`)
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
