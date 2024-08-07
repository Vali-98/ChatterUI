import * as FS from 'expo-file-system';

import { ToastAndroid } from 'react-native';
import { CompletionParams, LlamaContext, initLlama } from 'llama.rn';
import DocumentPicker, { DocumentPickerResponse } from 'react-native-document-picker';
import { mmkv } from './mmkv';
import { Global } from './GlobalValues';

export namespace Llama {
    const model_dir = `${FS.documentDirectory}models/`;

    const default_preset = {
        context_length: 2048,
        threads: 1,
        gpu_layers: 0,
        batch: 512,
    };

    var llamaContext: LlamaContext | void = undefined;
    var modelname = '';

    export const loadModel = async (name: string, preset = default_preset, usecache = true) => {
        let newname = name;
        let dir = `${model_dir}${name}`;
        // if not using from cache, pick model and load it
        /*
        if(!usecache)
        newname = await DocumentPicker.pickSingle().then(async (result : DocumentPickerResponse) => {
            if(DocumentPicker.isCancel(result)) return ''
            let name = result.name
            console.log(`Picked file: ${name}`)
            dir = result.uri
            console.log(dir)
            return name ?? ''
        }).catch(() => {
            console.log('Picking cancelled')
            ToastAndroid.show('No Model Chosen', 2000)
            return ''
        })
        */

        if (newname == '') {
            ToastAndroid.show('No Model Chosen', 2000);
            console.log(`No model chosen, new name was blank!`);
            return;
        }

        if (newname == modelname) {
            console.log('Model Already Loaded!');
            ToastAndroid.show('Model Already Loaded!', 2000);
            return;
        }

        if (usecache && !(await modelExists(name))) {
            console.log('Model does not exist!');
            ToastAndroid.show('Model Does Not Exist!', 2000);
            return;
        }

        if (llamaContext != undefined) {
            console.log('Unloading current model');
            await llamaContext?.release();
            modelname = '';
        }

        const params = {
            model: dir,
            n_ctx: preset.context_length,
            n_threads: preset.threads,
            n_batch: preset.batch,
        };

        ToastAndroid.show(`Loading Model: ${newname}`, 2000);
        console.log(`Loading Model: ${newname}`);

        console.log(params);
        llamaContext = await initLlama(params)
            .then((ctx) => {
                modelname = newname;
                ToastAndroid.show('Model Loaded', 2000);
                console.log('Model loaded');
                return ctx;
            })
            .catch((error) => {
                console.log(`Couldn't load model! Reason: ${error}`);
                ToastAndroid.show('Could Not Load Model!', 2000);
            });
        return;
        // session code fails atm
        await FS.getInfoAsync(`${model_dir}session.bin`).then((result) => {
            if (!result.exists) return;
            console.log('Loading previous session');
            if (llamaContext) llamaContext.loadSession(result.uri);
        });
    };

    export const completion = async (
        prompt: CompletionParams,
        callback = (text: string) => {
            console.log(text);
        }
    ) => {
        if (!isModelLoaded()) return;
        console.log('Completion begin.');
        if (llamaContext == undefined) return;
        return llamaContext
            ?.completion(prompt, (data: any) => {
                callback(data.token);
            })
            .then(({ text, timings }: any) => {
                console.log(timings);
            });
    };

    export const stopCompletion = async () => {
        return await llamaContext?.stopCompletion();
    };

    export const downloadModel = async (url: string) => {
        const modelName = nameFromURL(url);
        const modelList = await Llama.getModels();
        if (modelList.includes(modelName)) {
            ToastAndroid.show('Model already exists!', 2000);
            console.log('Model already exists!');
            return;
        }
        console.log('Downloading Model...');
        ToastAndroid.show('Downloading Model...', 2000);
        await FS.downloadAsync(url, `${model_dir}${modelName}`)
            .then(() => {
                ToastAndroid.show('Model downloaded!', 2000);
            })
            .catch(() => {
                ToastAndroid.show('Download failed', 2000);
            });
    };

    export const getModels = async () => {
        return await FS.readDirectoryAsync(model_dir);
    };

    export const modelExists = async (modelName: string) => {
        return (await getModels()).includes(modelName);
    };

    export const nameFromURL = (url: string) => {
        return url.split('resolve/main/')[1].replace('?download=true', '');
    };

    export const unloadModel = async () => {
        ToastAndroid.show('Unloading Model', 2000);
        console.log('Unloading Model');
        await llamaContext?.release();
        modelname = '';
        llamaContext = undefined;
        ToastAndroid.show('Model Unloaded', 2000);
        console.log('Model Unloaded');
    };

    export const deleteModel = async (name: string) => {
        if (await !modelExists(name)) return;
        if (name == modelname) modelname = '';
        return await FS.deleteAsync(`${model_dir}${name}`);
    };

    export const importModel = async () => {
        return DocumentPicker.pickSingle()
            .then(async (result: any) => {
                if (DocumentPicker.isCancel(result)) return false;
                let name = result.name;
                ToastAndroid.show('Importing file', ToastAndroid.SHORT);
                console.log('Importing file...');
                await FS.copyAsync({
                    from: result.uri,
                    to: `${model_dir}${name}`,
                })
                    .then(() => {
                        console.log('File Imported!');
                        ToastAndroid.show('File Imported!', 2000);
                    })
                    .catch((error) => {
                        ToastAndroid.show(error.message, 2000);
                        console.log(error);
                    });

                return false;
            })
            .catch(() => {
                console.log('Picking cancelled');
                ToastAndroid.show('No Model Chosen', 2000);
            });
        /*
        return getDocumentAsync({copyToCacheDirectory: false, type: 'application/octet-stream'}).then( async (result : any) => {
            
        })*/
    };

    export const isModelLoaded = (showmessage = true) => {
        if (showmessage && llamaContext == undefined) {
            ToastAndroid.show('No Model Loaded', 2000);
            console.log('No Model Loaded');
        }
        return llamaContext != undefined;
    };

    export const getModelname = () => {
        return modelname;
    };

    export const setLlamaPreset = () => {
        const presets = mmkv.getString(Global.LocalPreset);
        if (presets == undefined) mmkv.set(Global.LocalPreset, JSON.stringify(default_preset));
    };
}
