import { Storage } from '@lib/enums/Storage'
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

export type CompletionTimings = {
    predicted_per_token_ms: number
    predicted_per_second: number | null
    predicted_ms: number
    predicted_n: number

    prompt_per_token_ms: number
    prompt_per_second: number | null
    prompt_ms: number
    prompt_n: number
}

export type CompletionOutput = {
    text: string
    timings: CompletionTimings
}

export type LlamaState = {
    context: LlamaContext | undefined
    model: undefined | ModelDataType
    loadProgress: number
    chatCount: number
    promptCache?: string
    load: (model: ModelDataType) => Promise<void>
    setLoadProgress: (progress: number) => void
    unload: () => Promise<void>
    saveKV: (prompt: string | undefined) => Promise<void>
    loadKV: () => Promise<boolean>
    completion: (
        params: CompletionParams,
        callback: (text: string) => void,
        completed: (text: string, timngs: CompletionTimings) => void
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

export type EngineDataProps = {
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
                name: Storage.EngineData,
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
        chatCount: 0,
        model: undefined,
        promptCache: undefined,
        load: async (model: ModelDataType) => {
            const config = useEngineData.getState().config

            if (get()?.model?.id === model.id) {
                return Logger.errorToast('Model Already Loaded!')
            }

            if (checkGGMLDeprecated(parseInt(model.quantization))) {
                return Logger.errorToast('Quantization No Longer Supported!')
            }

            if (!(await getInfoAsync(model.file_path)).exists) {
                Logger.errorToast('Model Does Not Exist!')
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

            Logger.info(
                `\n------ MODEL LOAD -----\n Model Name: ${model.name}\nStarting with parameters: \nContext Length: ${params.n_ctx}\nThreads: ${params.n_threads}\nBatch Size: ${params.n_batch}`
            )

            const progressCallback = (progress: number) => {
                if (progress % 5 === 0) get().setLoadProgress(progress)
            }

            const llamaContext = await initLlama(params, progressCallback).catch((error) => {
                Logger.errorToast(`Could Not Load Model: ${error} `)
            })

            if (!llamaContext) return

            set((state) => ({
                ...state,
                context: llamaContext,
                model: model,
                chatCount: 1,
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
                Logger.errorToast('No Model Loaded')
                return
            }

            return llamaContext
                .completion(params, (data: any) => {
                    callback(data.token)
                })
                .then(async ({ text, timings }: CompletionOutput) => {
                    completed(text, timings)
                    Logger.info(
                        `\n---- Start Chat ${get().chatCount} ----\n${textTimings(timings)}\n---- End Chat ${get().chatCount} ----\n`
                    )
                    set((state) => ({ ...state, chatCount: get().chatCount + 1 }))
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
                Logger.errorToast('No Model Loaded')
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
            Logger.info(
                data === -1
                    ? 'Failed to save KV cache'
                    : `Saved KV in ${Math.floor(performance.now() - now)}ms with ${data} tokens`
            )
            Logger.info(`Current KV Size is: ${readableFileSize(await KV.getKVSize())}`)
        },
        loadKV: async () => {
            let result = false
            const llamaContext = get().context
            if (!llamaContext) {
                Logger.errorToast('No Model Loaded')
                return false
            }
            const data = await getInfoAsync(sessionFile)
            if (!data.exists) {
                Logger.warn('No Cache found')
                return false
            }
            await llamaContext
                .loadSession(sessionFile.replace('file://', ''))
                .then(() => {
                    Logger.info('Session loaded from KV cache')
                    result = true
                })
                .catch(() => {
                    Logger.error('Session loaded could not load from KV cache')
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
