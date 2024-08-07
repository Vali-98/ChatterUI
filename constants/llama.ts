import * as FS from 'expo-file-system'
import { CompletionParams, LlamaContext, initLlama } from 'llama.rn'
import { Platform } from 'react-native'
import DocumentPicker from 'react-native-document-picker'

import { Global } from './GlobalValues'
import { mmkv } from './mmkv'
import { Logger } from './Logger'

export namespace Llama {
    const model_dir = `${FS.documentDirectory}models/`

    const default_preset = {
        context_length: 2048,
        threads: 1,
        gpu_layers: 0,
        batch: 512,
    }

    let llamaContext: LlamaContext | void = undefined
    let modelname = ''

    export const loadModel = async (name: string, preset = default_preset, usecache = true) => {
        const newname = name
        const dir = `${model_dir}${name}`
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
            Logger.log(`No Model Chosen`, true)
            return ''
        })
        */

        if (newname === '') {
            Logger.log('No Model Chosen', true)
            return
        }

        if (newname === modelname) {
            Logger.log('Model Already Loaded!', true)
            return
        }

        if (usecache && !(await modelExists(name))) {
            Logger.log('Model Does Not Exist!', true)
            return
        }

        if (llamaContext !== undefined) {
            console.log('Unloading current model')
            await llamaContext?.release()
            modelname = ''
        }

        const params = {
            model: dir,
            n_ctx: preset.context_length,
            n_threads: preset.threads,
            n_batch: preset.batch,
            n_gpu_layers: Platform.OS === 'ios' ? preset.gpu_layers : 0,
        }

        Logger.log(`Loading Model: ${newname}`, true)
        Logger.log(JSON.stringify(params))

        llamaContext = await initLlama(params)
            .then((ctx) => {
                modelname = newname
                Logger.log('Model Loaded', true)
                return ctx
            })
            .catch((error) => {
                Logger.log(`Could Not Load Model: ${error} `, true)
            })

        /* session code fails atm
        await FS.getInfoAsync(`${model_dir}session.bin`).then((result) => {
            if (!result.exists) return;
            console.log('Loading previous session');
            if (llamaContext) llamaContext.loadSession(result.uri);
        });
        */
    }

    export const completion = async (
        prompt: CompletionParams,
        callback = (text: string) => {
            console.log(text)
        }
    ) => {
        if (!isModelLoaded()) return
        console.log('Completion begin.')
        if (llamaContext === undefined) return
        return llamaContext
            ?.completion(prompt, (data: any) => {
                callback(data.token)
            })
            .then(({ text, timings }: any) => {
                console.log(timings)
            })
    }

    export const stopCompletion = async () => {
        return await llamaContext?.stopCompletion()
    }

    export const downloadModel = async (url: string) => {
        const modelName = nameFromURL(url)
        const modelList = await Llama.getModels()
        if (modelList.includes(modelName)) {
            Logger.log('Model already exists!', true)
            return
        }
        Logger.log('Downloading Model...', true)
        await FS.downloadAsync(url, `${model_dir}${modelName}`)
            .then(() => {
                Logger.log('Model downloaded!', true)
            })
            .catch(() => {
                Logger.log('Download failed', true)
            })
    }

    export const getModels = async () => {
        return await FS.readDirectoryAsync(model_dir)
    }

    export const modelExists = async (modelName: string) => {
        return (await getModels()).includes(modelName)
    }

    export const nameFromURL = (url: string) => {
        return url.split('resolve/main/')[1].replace('?download=true', '')
    }

    export const unloadModel = async () => {
        Logger.log('Unloading Model', true)
        await llamaContext?.release()
        modelname = ''
        llamaContext = undefined
        Logger.log('Model Unloaded', true)
    }

    export const deleteModel = async (name: string) => {
        if (await !modelExists(name)) return
        if (name === modelname) modelname = ''
        return await FS.deleteAsync(`${model_dir}${name}`)
    }

    export const importModel = async () => {
        return DocumentPicker.pickSingle()
            .then(async (result: any) => {
                if (DocumentPicker.isCancel(result)) return false
                const name = result.name
                Logger.log('Importing file...', true)
                await FS.copyAsync({
                    from: result.uri,
                    to: `${model_dir}${name}`,
                })
                    .then(() => {
                        Logger.log('File Imported!', true)
                    })
                    .catch((error) => {
                        Logger.log(`Import Failed: ${error.message}`, true)
                    })

                return false
            })
            .catch(() => {
                Logger.log('No Model Chosen', true)
            })
        /*
        return getDocumentAsync({copyToCacheDirectory: false, type: 'application/octet-stream'}).then( async (result : any) => {
            
        })*/
    }

    export const isModelLoaded = (showmessage = true) => {
        if (showmessage && llamaContext === undefined) {
            Logger.log('No Model Loaded', true)
        }
        return llamaContext !== undefined
    }

    export const getModelname = () => {
        return modelname
    }

    export const setLlamaPreset = () => {
        const presets = mmkv.getString(Global.LocalPreset)
        if (presets === undefined) mmkv.set(Global.LocalPreset, JSON.stringify(default_preset))
    }
}
