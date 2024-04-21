import * as DocumentPicker from 'expo-document-picker'
import * as FS from 'expo-file-system'

import { API } from './API'
import { Logger } from './Logger'

export type SamplerPreset = {
    temp: number
    top_p: number
    top_k: number
    top_a: number
    // merged from KAI

    min_p: number
    single_line: boolean
    sampler_order: Array<number>
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
}

export type SamplerField = keyof SamplerPreset

export namespace Presets {
    const presetdir = `${FS.documentDirectory}presets/`

    const getPresetDir = (name: string) => `${presetdir}${name}.json`

    type FieldList = {
        [key in API]: Array<SamplerField>
    }

    export const APIFields: FieldList = {
        [API.KAI]: [
            'max_length',
            'genamt',
            'rep_pen',
            'rep_pen_range',
            'rep_pen_slope',
            'temp',
            'tfs',
            'top_a',
            'top_k',
            'top_p',
            'min_p',
            'typical',
            'single_line',
            'seed',
            'mirostat_mode',
            'mirostat_tau',
            'mirostat_eta',
            'grammar_string',
            'dynatemp_range',
            'smoothing_factor',
        ],
        [API.TGWUI]: [
            'max_length',
            'genamt',
            'rep_pen',
            'rep_pen_range',
            'rep_pen_slope',
            'temp',
            'tfs',
            'top_a',
            'top_k',
            'top_p',
            'min_p',
            'typical',
            'single_line',
            'seed',
            'mirostat_mode',
            'mirostat_tau',
            'mirostat_eta',
            'grammar_string',
            'epsilon_cutoff',
            'eta_cutoff',
            'min_length',
            'no_repeat_ngram_size',
            'num_beams',
            'penalty_alpha',
            'length_penalty',
            'early_stopping',
            'add_bos_token',
            'truncation_length',
            'ban_eos_token',
            'skip_special_tokens',
            'freq_pen',
            'presence_pen',
            'dynatemp_range',
            'smoothing_factor',
        ],
        [API.HORDE]: [
            'max_length',
            'genamt',
            'rep_pen',
            'rep_pen_range',
            'rep_pen_slope',
            'temp',
            'tfs',
            'top_a',
            'top_k',
            'top_p',
            'min_p',
            'ban_eos_token',
            'typical',
            'single_line',
            'min_p',
        ],
        [API.MANCER]: [
            'max_length',
            'genamt',
            'rep_pen',
            'temp',
            'top_a',
            'top_k',
            'top_p',
            'freq_pen',
            'presence_pen',
        ],
        [API.COMPLETIONS]: [
            'max_length',
            'genamt',
            'rep_pen',
            'temp',
            'tfs',
            'top_a',
            'top_k',
            'top_p',
            'min_p',
            'freq_pen',
            'presence_pen',
            'seed',
            'typical',
            'ban_eos_token',
            'smoothing_factor',
            'mirostat_mode',
            'mirostat_tau',
            'mirostat_eta',
            'grammar_string',
        ],
        [API.LOCAL]: [
            'genamt',
            'rep_pen',
            'rep_pen_range',
            'temp',
            'top_a',
            'top_k',
            'top_p',
            'freq_pen',
            'tfs',
            'typical',
            'presence_pen',
            'mirostat_mode',
            'mirostat_tau',
            'mirostat_eta',
            'grammar_string',
            'min_p',
            'seed',
        ],
        [API.OPENROUTER]: [
            'max_length',
            'freq_pen',
            'genamt',
            'presence_pen',
            'seed',
            'temp',
            'top_p',
            'top_k',
        ],
        [API.OPENAI]: ['max_length', 'freq_pen', 'genamt', 'presence_pen', 'seed', 'temp', 'top_p'],
        [API.NOVELAI]: [],
        [API.APHRODITE]: [],
    }

    export const defaultPreset = () => {
        return {
            temp: 1,
            top_p: 1,
            top_k: 40,
            top_a: 0,
            // merged from KAI

            min_p: 0.0,
            single_line: false,
            sampler_order: [6, 0, 1, 3, 4, 2, 5],
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
            truncation_length: 2048,
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
            rep_pen_size: 0,
            genamt: 256,
            max_length: 4096,

            dynatemp_range: 0,
            smoothing_factor: 0,
        }
    }

    export const fixPreset = (preset: any, filename = '') => {
        const existingKeys = Object.keys(preset)
        const targetPreset: any = defaultPreset()
        const defaultKeys = Object.keys(targetPreset)
        let samekeys = true
        defaultKeys.map((key: any) => {
            if (existingKeys.includes(key)) return
            preset[key] = targetPreset[key]
            samekeys = false
        })
        if (filename !== '') saveFile(filename, preset)
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

    export const saveFile = async (name: string, preset: object) => {
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
