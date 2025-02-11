import { AppDirectory, readableFileSize } from '@lib/utils/File'
import { CompletionParams, ContextParams, initLlama, LlamaContext } from 'cui-llama.rn'
import { ModelDataType } from 'db/schema'
import { getInfoAsync, writeAsStringAsync } from 'expo-file-system'
import { create } from 'zustand'
import { createJSONStorage, persist } from 'zustand/middleware'

import { checkGGMLDeprecated } from './GGML'
import { KV } from './Model'
import { AppSettings } from '../../constants/GlobalValues'
import { Logger } from '../../state/Logger'
import { mmkv, mmkvStorage } from '../../storage/MMKV'

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
    model: undefined | ModelDataType
    loadProgress: number
    promptCache?: string
    load: (model: ModelDataType) => Promise<void>
    setLoadProgress: (progress: number) => void
    unload: () => Promise<void>
    saveKV: (prompt: string | undefined) => Promise<void>
    loadKV: () => Promise<boolean>
    completion: (
        params: CompletionParams,
        callback: (text: string) => void,
        completed: (text: string) => void
    ) => Promise<void>
    stopCompletion: () => Promise<void>
    tokenLength: (text: string) => number
    tokenize: (text: string) => { tokens: number[] } | undefined
}

export type LlamaConfig = {
    context_length: number
    threads: number
    gpu_layers: number
    batch: number
}

type EngineDataProps = {
    config: LlamaConfig
    lastModel?: ModelDataType
    setConfiguration: (config: LlamaConfig) => void
    setLastModelLoaded: (model: ModelDataType) => void
}

const sessionFile = `${AppDirectory.SessionPath}llama-session.bin`

const defaultConfig = {
    context_length: 4096,
    threads: 4,
    gpu_layers: 0,
    batch: 512,
}

export namespace Llama {
    export const useEngineData = create<EngineDataProps>()(
        persist(
            (set) => ({
                config: defaultConfig,
                lastModel: undefined,
                setConfiguration: (config: LlamaConfig) => {
                    set((state) => ({ ...state, config: config }))
                },
                setLastModelLoaded: (model: ModelDataType) => {
                    set((state) => ({ ...state, lastModel: model }))
                },
            }),
            {
                name: 'enginedata-storage',
                partialize: (state) => ({
                    config: state.config,
                    lastModel: state.lastModel,
                }),
                storage: createJSONStorage(() => mmkvStorage),
                version: 1,
            }
        )
    )

    export const useLlama = create<LlamaState>()((set, get) => ({
        context: undefined,
        loadProgress: 0,
        model: undefined,
        promptCache: undefined,
        load: async (model: ModelDataType) => {
            const config = useEngineData.getState().config

            if (get()?.model?.id === model.id) {
                return Logger.log('Model Already Loaded!', true)
            }

            if (checkGGMLDeprecated(parseInt(model.quantization))) {
                return Logger.log('Quantization No Longer Supported!', true)
            }

            if (!(await getInfoAsync(model.file_path)).exists) {
                Logger.log('Model Does Not Exist!', true)
                return
            }

            if (get().context !== undefined) {
                await get().unload()
            }

            const params: ContextParams = {
                model: model.file_path,
                n_ctx: config.context_length,
                n_threads: config.threads,
                n_batch: config.batch,
            }

            /*
            let setAutoLoad = false

            try {
                const modelString = mmkv.getString(Global.LocalModel)
                if (modelString) {
                    const oldmodel: ModelDataType | undefined = JSON.parse(modelString)
                    setAutoLoad = oldmodel?.id !== model.id
                }
            } catch (e) {}
            // When LocalSessionLoaded is set to false, it will load KV cache.
            // We check if the model id is the same as above, if not, set to true to skip kv-cache load
            // This probably should be changed as the parameter name is somewhat confusing
            // TODO: Investigate why KV cache is loaded on chat instead of on model start
            mmkv.set(Global.LocalSessionLoaded, setAutoLoad)
            */

            Logger.log(
                `Starting with parameters: \nContext Length: ${params.n_ctx}\nThreads: ${params.n_threads}\nBatch Size: ${params.n_batch}`
            )

            const progressCallback = (progress: number) => {
                if (progress % 5 === 0) get().setLoadProgress(progress)
            }

            const llamaContext = await initLlama(params, progressCallback).catch((error) => {
                Logger.log(`Could Not Load Model: ${error} `, true)
            })

            if (!llamaContext) return

            set((state) => ({
                ...state,
                context: llamaContext,
                model: model,
            }))

            // updated EngineData
            useEngineData.getState().setLastModelLoaded(model)
            KV.useKVState.getState().setKvCacheLoaded(false)
        },
        setLoadProgress: (progress: number) => {
            set((state) => ({ ...state, loadProgress: progress }))
        },
        unload: async () => {
            await get().context?.release()
            set((state) => ({
                ...state,
                context: undefined,
                model: undefined,
            }))
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
                        await get().saveKV(params.prompt)
                    }
                })
        },
        stopCompletion: async () => {
            await get().context?.stopCompletion()
        },
        saveKV: async (prompt: string | undefined) => {
            const llamaContext = get().context
            if (!llamaContext) {
                Logger.log('No Model Loaded', true)
                return
            }

            if (prompt) {
                const tokens = get().tokenize(prompt)?.tokens
                KV.useKVState.getState().setKvCacheTokens(tokens ?? [])
            }

            if (!(await getInfoAsync(sessionFile)).exists) {
                await writeAsStringAsync(sessionFile, '', { encoding: 'base64' })
            }

            const now = performance.now()
            const data = await llamaContext.saveSession(sessionFile.replace('file://', ''))
            Logger.log(
                data === -1
                    ? 'Failed to save KV cache'
                    : `Saved KV in ${Math.floor(performance.now() - now)}ms with ${data} tokens`
            )
            Logger.log(`Current KV Size is: ${readableFileSize(await KV.getKVSize())}`)
        },
        loadKV: async () => {
            let result = false
            const llamaContext = get().context
            if (!llamaContext) {
                Logger.log('No Model Loaded', true)
                return false
            }
            const data = await getInfoAsync(sessionFile)
            if (!data.exists) {
                Logger.log('No Cache found')
                return false
            }
            await llamaContext
                .loadSession(sessionFile.replace('file://', ''))
                .then(() => {
                    Logger.log('Session loaded from KV cache')
                    result = true
                })
                .catch(() => {
                    Logger.log('Session loaded could not load from KV cache')
                })
            return result
        },
        tokenLength: (text: string) => {
            return get().context?.tokenizeSync(text)?.tokens?.length ?? 0
        },
        tokenize: (text: string) => {
            return get().context?.tokenizeSync(text)
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

    // Downloaders - Old Placeholder
    /*
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
        const fileInfo = await getInfoAsync(`${AppDirectory.ModelPath}${filename}`)
        if (fileInfo.exists) {
            Logger.log('Model already exists!', true)
            // return
        }
        let current = 0
        const downloadTask = createDownloadResumable(
            url,
            `${cacheDirectory}${filename}`,
            {},
            (progress) => {
                const percentage = progress.totalBytesWritten / progress.totalBytesExpectedToWrite
                if (percentage <= current) return
                current = percentage
            }
        )
        await downloadTask
            .downloadAsync()
            .then(async (result) => {
                if (!result?.uri) {
                    Logger.log('Download failed')
                    return
                }
                await moveAsync({
                    from: result.uri,
                    to: `${AppDirectory.ModelPath}${filename}`,
                }).then(() => {
                    Logger.log(`${filename} downloaded sucessfully!`)
                })
            })
            .catch((err) => Logger.log(`Failed to download: ${err}`))
    }*/
}
