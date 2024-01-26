import * as DocumentPicker from 'expo-document-picker';
import * as FS from 'expo-file-system';
import { ToastAndroid } from 'react-native';

import { API } from './API';

export namespace Presets {
    const presetdir = `${FS.documentDirectory}presets/`;

    const getPresetDir = (name: string) => `${presetdir}${name}.json`;

    export const APIFields: object = {
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
            'grammar',
            'dynatemp_range',
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
            'grammar',
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
            'ban_eos_tokens',
            'mirostat_mode',
            'mirostat_tau',
            'mirostat_eta',
            'grammar',
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
            'grammar',
            'min_p',
            'seed',
        ],
        [API.OPENROUTER]: ['freq_pen', 'genamt', 'presence_pen', 'seed', 'temp', 'top_p', 'top_k'],
    };

    export const defaultPreset = () => {
        return {
            temp: 1,
            top_p: 1,
            top_k: 0,
            top_a: 1,
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
        };
    };

    const fixPreset = async (preset: any, filename = '') => {
        const existingKeys = Object.keys(preset);
        const targetPreset: any = defaultPreset();
        const defaultKeys = Object.keys(targetPreset);
        let samekeys = true;
        defaultKeys.map((key: any) => {
            if (existingKeys.includes(key)) return;
            preset[key] = targetPreset[key];
            samekeys = false;
        });
        if (filename !== '') await saveFile(filename, preset);
        if (!samekeys) console.log(`Preset fixed!`);
        return JSON.stringify(preset);
    };

    export const loadFile = async (name: string) => {
        return FS.readAsStringAsync(getPresetDir(name), {
            encoding: FS.EncodingType.UTF8,
        }).then((file) => {
            return fixPreset(JSON.parse(file), name);
        });
    };

    export const saveFile = async (name: string, preset: object) => {
        return FS.writeAsStringAsync(getPresetDir(name), JSON.stringify(preset), {
            encoding: FS.EncodingType.UTF8,
        });
    };

    export const deleteFile = async (name: string) => {
        return FS.deleteAsync(getPresetDir(name));
    };

    export const getFileList = async () => {
        return FS.readDirectoryAsync(presetdir);
    };

    export const uploadFile = async () => {
        return DocumentPicker.getDocumentAsync({ type: ['application/*'] }).then((result) => {
            if (
                result.canceled ||
                (!result.assets[0].name.endsWith('json') &&
                    !result.assets[0].name.endsWith('settings'))
            ) {
                ToastAndroid.show(`Invalid File Type!`, 3000);
                return;
            }
            const name = result.assets[0].name.replace(`.json`, '').replace('.settings', '');
            return FS.copyAsync({
                from: result.assets[0].uri,
                to: getPresetDir(name),
            })
                .then(() => {
                    return FS.readAsStringAsync(getPresetDir(name), {
                        encoding: FS.EncodingType.UTF8,
                    });
                })
                .then(async (file) => {
                    await fixPreset(JSON.parse(file), name);
                    return name;
                })
                .catch((error) => {
                    console.log(error);
                    ToastAndroid.show(error.message, 2000);
                });
        });
    };
}
