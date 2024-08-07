import * as DocumentPicker from 'expo-document-picker';
import * as FS from 'expo-file-system';
import { ToastAndroid } from 'react-native';

export namespace Instructs {
    export const loadFile = async (name: string) => {
        return FS.readAsStringAsync(`${FS.documentDirectory}instruct/${name}.json`, {
            encoding: FS.EncodingType.UTF8,
        });
    };

    export const saveFile = async (name: string, preset: object) => {
        return FS.writeAsStringAsync(
            `${FS.documentDirectory}instruct/${name}.json`,
            JSON.stringify(preset),
            { encoding: FS.EncodingType.UTF8 }
        );
    };

    export const deleteFile = async (name: string) => {
        return FS.deleteAsync(`${FS.documentDirectory}instruct/${name}.json`);
    };

    export const getFileList = async () => {
        return FS.readDirectoryAsync(`${FS.documentDirectory}instruct`);
    };

    export const uploadFile = async () => {
        return DocumentPicker.getDocumentAsync({ type: 'application/json' }).then((result) => {
            if (result.canceled) return;
            const name = result.assets[0].name.replace(`.json`, '');
            return FS.copyAsync({
                from: result.assets[0].uri,
                to: `${FS.documentDirectory}/instruct/${name}.json`,
            })
                .then(() => {
                    return FS.readAsStringAsync(`${FS.documentDirectory}/instruct/${name}.json`, {
                        encoding: FS.EncodingType.UTF8,
                    });
                })
                .then((file) => {
                    const filekeys = Object.keys(JSON.parse(file));
                    const correctkeys = Object.keys(defaultInstruct());
                    const samekeys = filekeys.every((element, index) => {
                        return element === correctkeys[index];
                    });
                    if (!samekeys) {
                        return FS.deleteAsync(`${FS.documentDirectory}/instruct/${name}.json`).then(
                            () => {
                                throw new TypeError(`JSON file has invalid format`);
                            }
                        );
                    } else return name;
                })
                .catch((error) => ToastAndroid.show(error.message, 2000));
        });
    };

    export const defaultInstruct = () => {
        return {
            system_prompt:
                "Write {{char}}'s next reply in a roleplay chat between {{char}} and {{user}}.",
            input_sequence: '### Instruction: ',
            output_sequence: '### Response: ',
            first_output_sequence: '',
            last_output_sequence: '',
            system_sequence_prefix: '### Instruction: ',
            system_sequence_suffix: '',
            stop_sequence: '',
            separator_sequence: '',
            wrap: false,
            macro: false,
            names: false,
            names_force_groups: false,
            activation_regex: '',
            name: 'Default',
        };
    };
}
