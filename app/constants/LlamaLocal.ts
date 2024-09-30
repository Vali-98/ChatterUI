import { CompletionParams, ContextParams, LlamaContext, initLlama } from 'cui-llama.rn'
import { getDocumentAsync } from 'expo-document-picker'
import * as FS from 'expo-file-system'
import { Platform } from 'react-native'

import { create } from 'zustand'

import { AppSettings, Global } from './GlobalValues'
import { Logger } from './Logger'
import { mmkv } from './MMKV'

type CompletionTimings = {
    predicted_per_token_ms: number
    predicted_per_second: number | null
    predicted_ms: number
    predicted_n: number

    prompt_per_token_ms: number
    prompt_per_second: number | null
    prompt_ms: number
    prompt_n: number
}

type CompletionOutput = {
    text: string
    timings: CompletionTimings
}

type LlamaState = {
    context: LlamaContext | undefined
    modelname: string | undefined
    loadProgress: number
    load: (name: string, preset?: LlamaPreset, usecache?: boolean) => Promise<void>
    setLoadProgress: (progress: number) => void
    unload: () => Promise<void>
    saveKV: () => Promise<void>
    loadKV: () => Promise<void>
    completion: (
        params: CompletionParams,
        callback: (text: string) => void,
        completed: (text: string) => void
    ) => Promise<void>
    stopCompletion: () => Promise<void>
    tokenLength: (text: string) => number
}

export type LlamaPreset = {
    context_length: number
    threads: number
    gpu_layers: number
    batch: number
}

const sessionFileDir = `${FS.documentDirectory}llama/`
const sessionFile = `${sessionFileDir}llama-session.bin`

const default_preset = {
    context_length: 4096,
    threads: 4,
    gpu_layers: 0,
    batch: 512,
}

export namespace Llama {
    const model_dir = `${FS.documentDirectory}models/`

    export const useLlama = create<LlamaState>()((set, get) => ({
        context: undefined,
        modelname: undefined,
        loadProgress: 0,
        load: async (
            name: string,
            preset: LlamaPreset = default_preset,
            usecache: boolean = true
        ) => {
            const dir = `${model_dir}${name}`

            switch (name) {
                case '':
                    return Logger.log('No Model Chosen', true)
                case get().modelname:
                    return Logger.log('Model Already Loaded!', true)
            }

            if (!(await modelExists(name))) {
                Logger.log('Model Does Not Exist!', true)
                return
            }

            if (get().context !== undefined) {
                Logger.log('Unloading current model', true)
                await get().context?.release()
                set((state) => ({ ...state, context: undefined, modelname: undefined }))
            }

            const params: ContextParams = {
                model: dir,
                n_ctx: preset.context_length,
                n_threads: preset.threads,
                n_batch: preset.batch,
                n_gpu_layers: Platform.OS === 'ios' ? preset.gpu_layers : 0,
                use_mlock: true,
            }

            mmkv.set(Global.LocalSessionLoaded, false)
            Logger.log(`Loading Model: ${name}`)
            Logger.log(
                `Starting with parameters: \nContext Length: ${params.n_ctx}\nThreads: ${params.n_threads}\nBatch Size: ${params.n_batch}`
            )

            const progressCallback = (progress: number) => {
                if (progress % 5 === 0) get().setLoadProgress(progress)
            }

            const llamaContext = await initLlama(params, progressCallback).catch((error) => {
                Logger.log(`Could Not Load Model: ${error} `, true)
            })

            if (llamaContext) {
                set((state) => ({ ...state, context: llamaContext, modelname: name }))
                Logger.log('Model Loaded', true)
            }
        },
        setLoadProgress: (progress: number) => {
            set((state) => ({ ...state, loadProgress: progress }))
        },
        unload: async () => {
            await get().context?.release()
            set((state) => ({ ...state, context: undefined, modelname: undefined }))
            Logger.log('Model Unloaded', true)
        },
        completion: async (
            params: CompletionParams,
            callback = (text: string) => {},
            completed = (text: string) => {}
        ) => {
            const llamaContext = get().context
            if (llamaContext === undefined) {
                Logger.log('No Model Loaded', true)
                return
            }

            return llamaContext
                .completion(params, (data: any) => {
                    callback(data.token)
                })
                .then(async ({ text, timings }: CompletionOutput) => {
                    completed(text)
                    Logger.log(textTimings(timings))
                    if (mmkv.getBoolean(AppSettings.SaveLocalKV)) {
                        await get().saveKV()
                    }
                })
        },
        stopCompletion: async () => {
            await get().context?.stopCompletion()
        },
        saveKV: async () => {
            const llamaContext = get().context
            if (!llamaContext) {
                Logger.log('No Model Loaded', true)
                return
            }
            if (!(await FS.getInfoAsync(sessionFileDir)).exists) {
                await FS.makeDirectoryAsync(sessionFileDir)
            }

            if (!(await FS.getInfoAsync(sessionFile)).exists) {
                await FS.writeAsStringAsync(sessionFile, '', { encoding: 'base64' })
            }

            const now = performance.now()
            const data = await llamaContext.saveSession(sessionFile.replace('file://', ''))
            Logger.log(
                data === -1
                    ? 'Failed to save KV cache'
                    : `Saved KV in ${Math.floor(performance.now() - now)}ms with ${data} tokens`
            )
            Logger.log(`Current KV Size is: ${await getKVSizeMB()}MB`)
        },
        loadKV: async () => {
            const llamaContext = get().context
            if (!llamaContext) {
                Logger.log('No Model Loaded', true)
                return
            }
            const data = await FS.getInfoAsync(sessionFile)
            if (!data.exists) {
                Logger.log('No cache found')
                return
            }
            await llamaContext
                .loadSession(sessionFile.replace('file://', ''))
                .then(() => {
                    Logger.log('Session loaded from KV cache')
                })
                .catch(() => {
                    Logger.log('Session loaded could not load from KV cache')
                })
        },
        tokenLength: (text: string) => {
            return get().context?.tokenizeSync(text)?.tokens?.length ?? 0
        },
    }))

    const textTimings = (timings: CompletionTimings) => {
        return (
            `\n[Prompt Timings]` +
            (timings.prompt_n > 0
                ? `\nPrompt Per Token: ${timings.prompt_per_token_ms} ms/token` +
                  `\nPrompt Per Second: ${timings.prompt_per_second?.toFixed(2) ?? 0} tokens/s` +
                  `\nPrompt Time: ${(timings.prompt_ms / 1000).toFixed(2)}s` +
                  `\nPrompt Tokens: ${timings.prompt_n} tokens`
                : '\nNo Tokens Processed') +
            `\n\n[Predicted Timings]` +
            (timings.predicted_n > 0
                ? `\nPredicted Per Token: ${timings.predicted_per_token_ms} ms/token` +
                  `\nPredicted Per Second: ${timings.predicted_per_second?.toFixed(2) ?? 0} tokens/s` +
                  `\nPrediction Time: ${(timings.predicted_ms / 1000).toFixed(2)}s` +
                  `\nPredicted Tokens: ${timings.predicted_n} tokens\n`
                : '\nNo Tokens Generated')
        )
    }

    // Presets

    export const setLlamaPreset = () => {
        const presets = mmkv.getString(Global.LocalPreset)
        if (presets === undefined) mmkv.set(Global.LocalPreset, JSON.stringify(default_preset))
    }

    // Downloaders

    export const downloadModel = async (
        url: string,
        callback?: () => void,
        cancel?: (cancel: () => void) => void
    ) => {
        // check if this model already exists
        const result = await fetch(url, { method: 'HEAD' })
        const contentDisposition = result.headers.get('Content-Disposition')
        let filename = undefined
        if (contentDisposition && contentDisposition.includes('filename=')) {
            filename = contentDisposition.split('filename=')[1].split(';')[0].replace(/['"]/g, '')
        }
        if (!filename) {
            Logger.log('Invalid URL', true)
            return
        }
        const fileInfo = await FS.getInfoAsync(`${model_dir}${filename}`)
        if (fileInfo.exists) {
            Logger.log('Model already exists!', true)
            // return
        }
        let current = 0
        const downloadTask = FS.createDownloadResumable(
            url,
            `${FS.cacheDirectory}${filename}`,
            {},
            (progress) => {
                const percentage = progress.totalBytesWritten / progress.totalBytesExpectedToWrite
                if (percentage <= current) return
                current = percentage
                console.log(percentage)
            }
        )
        await downloadTask
            .downloadAsync()
            .then(async (result) => {
                if (!result?.uri) {
                    Logger.log('Download failed')
                    return
                }
                await FS.moveAsync({
                    from: result.uri,
                    to: `${model_dir}${filename}`,
                }).then(() => {
                    Logger.log(`${filename} downloaded sucessfully!`)
                })
            })
            .catch((err) => Logger.log(`Failed to download: ${err}`))
    }

    // Filesystem

    export const getModelList = async () => {
        return await FS.readDirectoryAsync(model_dir)
    }

    export const modelExists = async (modelName: string) => {
        return (await getModelList()).includes(modelName)
    }

    export const deleteModel = async (name: string) => {
        if (!(await modelExists(name))) return
        if (name === useLlama.getState().modelname) await useLlama.getState().unload()
        return await FS.deleteAsync(`${model_dir}${name}`)
    }

    export const importModel = async () => {
        return getDocumentAsync({
            copyToCacheDirectory: false,
        }).then(async (result) => {
            if (result.canceled) return
            const file = result.assets[0]
            const name = file.name
            Logger.log('Importing file...', true)
            const success = await FS.copyAsync({
                from: file.uri,
                to: `${model_dir}${name}`,
            })
                .then(() => {
                    return true
                })
                .catch((error) => {
                    Logger.log(`Import Failed: ${error.message}`, true)
                    return false
                })
            if (!success) return

            // database routine here

            // end
            Logger.log(`Model Imported Sucessfully!`, true)
        })
    }

    export const getKVSizeMB = async () => {
        const data = await FS.getInfoAsync(sessionFile)
        if (!data.exists) {
            return 0
        }
        return Math.floor(data.size * 0.000001)
    }

    export const deleteKV = async () => {
        if ((await FS.getInfoAsync(sessionFile)).exists) {
            await FS.deleteAsync(sessionFile)
        }
    }

    export const kvInfo = async () => {
        const data = await FS.getInfoAsync(sessionFile)
        if (!data.exists) {
            Logger.log('No KV Cache found')
            return
        }
        Logger.log(`Size of KV cache: ${Math.floor(data.size * 0.000001)} MB`)
    }
}
