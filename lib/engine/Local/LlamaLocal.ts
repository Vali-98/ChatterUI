import { Storage } from '@lib/enums/Storage'
import { AppDirectory, readableFileSize } from '@lib/utils/File'
import {
    CompletionParams,
    ContextParams,
    initLlama,
    LlamaContext,
    RNLLAMA_MTMD_DEFAULT_MEDIA_MARKER,
} from 'cui-llama.rn'
import { ModelDataType } from 'db/schema'
import { getInfoAsync, writeAsStringAsync } from 'expo-file-system'
import { create } from 'zustand'
import { persist } from 'zustand/middleware'

import { AppSettings } from '../../constants/GlobalValues'
import { Logger } from '../../state/Logger'
import { createMMKVStorage, mmkv } from '../../storage/MMKV'
import { checkGGMLDeprecated } from './GGML'
import { KV, Model } from './Model'

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
    model?: ModelDataType
    mmproj?: ModelDataType
    loadProgress: number
    chatCount: number
    promptCache?: string
    load: (model: ModelDataType) => Promise<void>
    loadMmproj: (model: ModelDataType) => Promise<void>
    setLoadProgress: (progress: number) => void
    unload: () => Promise<void>
    unloadMmproj: () => Promise<void>
    saveKV: (prompt: string | undefined, media_paths?: string[]) => Promise<void>
    loadKV: () => Promise<boolean>
    completion: (
        params: CompletionParams,
        callback: (text: string) => void,
        completed: (text: string, timngs: CompletionTimings) => void
    ) => Promise<void>
    stopCompletion: () => Promise<void>
    tokenLength: (text: string, mediaPaths?: string[]) => Promise<number>
    tokenize: (text: string, media_paths?: string[]) => { tokens: number[] } | undefined
}

export type LlamaConfig = {
    context_length: number
    threads: number
    gpu_layers: number
    batch: number
    ctx_shift: boolean
}

export type EngineDataProps = {
    config: LlamaConfig
    lastModel?: ModelDataType
    lastMmproj?: ModelDataType
    setConfiguration: (config: LlamaConfig) => void
    setLastModelLoaded: (model: ModelDataType | undefined) => void
    setLastMmprojLoaded: (model: ModelDataType | undefined) => void
    maybeClearLastLoaded: (mode: ModelDataType) => void
}

const sessionFile = `${AppDirectory.SessionPath}llama-session.bin`

const defaultConfig = {
    context_length: 4096,
    threads: 4,
    gpu_layers: 0,
    batch: 512,
    ctx_shift: true,
}

export namespace Llama {
    export const useLlamaPreferencesStore = create<EngineDataProps>()(
        persist(
            (set, get) => ({
                config: defaultConfig,
                setConfiguration: (config: LlamaConfig) => {
                    set({ config: config })
                },
                setLastModelLoaded: (model: ModelDataType | undefined) => {
                    if (get().lastModel?.id === model?.id) return
                    set({ lastModel: model, lastMmproj: undefined })
                },
                setLastMmprojLoaded: (mmproj: ModelDataType | undefined) => {
                    set({ lastMmproj: mmproj })
                },
                maybeClearLastLoaded: (data) => {
                    if (data.id === get().lastModel?.id) {
                        set({ lastModel: undefined, lastMmproj: undefined })
                    } else if (data.id === get().lastMmproj?.id) {
                        set({ lastMmproj: undefined })
                    }
                },
            }),
            {
                name: Storage.EngineData,
                partialize: (state) => ({
                    config: state.config,
                    lastModel: state.lastModel,
                    lastMmproj: state.lastMmproj,
                }),
                storage: createMMKVStorage(),
                version: 1,
                migrate: (persistedState: any, version) => {
                    if (version === 1) {
                        persistedState.config.ctx_shift = true
                        Logger.info('Migrated to v2 EngineData')
                    }
                },
            }
        )
    )

    export const useLlamaModelStore = create<LlamaState>()((set, get) => ({
        context: undefined,
        loadProgress: 0,
        chatCount: 0,
        promptCache: undefined,
        load: async (model: ModelDataType) => {
            const config = useLlamaPreferencesStore.getState().config

            if (get()?.model?.id === model.id) {
                return Logger.errorToast('Model Already Loaded!')
            }

            if (checkGGMLDeprecated(parseInt(model.quantization))) {
                return Logger.errorToast('Quantization No Longer Supported!')
            }

            if (!(await Model.getModelExists(model.file_path))) {
                Logger.errorToast('Model Does Not Exist!')
                Model.verifyModelList()
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
                ctx_shift: config.ctx_shift,
                use_mlock: true,
                use_mmap: true,
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

            set({
                context: llamaContext,
                model: model,
                chatCount: 1,
            })

            // updated EngineData
            useLlamaPreferencesStore.getState().setLastModelLoaded(model)
            KV.useKVStore.getState().setKvCacheLoaded(false)
        },
        loadMmproj: async (model: ModelDataType) => {
            const context = get().context
            if (!context) return

            Logger.info('Loading MMPROJ')
            await context
                .initMultimodal({ path: model.file_path, use_gpu: true })
                .catch((e) => Logger.errorToast('Failed to load MMPROJ: ' + e))

            // TODO: Fix previewing model capabilities
            // refer to https://github.com/mybigday/llama.rn/issues/151

            set({
                mmproj: model,
            })

            useLlamaPreferencesStore.getState().setLastMmprojLoaded(model)
        },
        setLoadProgress: (progress: number) => {
            set({ loadProgress: progress })
        },
        unload: async () => {
            if (get().mmproj) {
                await get().context?.releaseMultimodal()
            }

            await get().context?.release()
            set({
                context: undefined,
                model: undefined,
                mmproj: undefined,
            })
        },
        unloadMmproj: async () => {
            if (!get().mmproj) return
            await get()
                .context?.releaseMultimodal()
                .catch((e) => {
                    Logger.errorToast('Failed to unload MMPROJ: ' + e)
                })
            set({
                mmproj: undefined,
            })
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
                    set({ chatCount: get().chatCount + 1 })
                    if (mmkv.getBoolean(AppSettings.SaveLocalKV)) {
                        await get().saveKV(params.prompt, params.media_paths ?? [])
                    }
                })
        },
        stopCompletion: async () => {
            await get().context?.stopCompletion()
        },
        saveKV: async (prompt, media_paths) => {
            const llamaContext = get().context
            if (!llamaContext) {
                Logger.errorToast('No Model Loaded')
                return
            }

            if (prompt) {
                const tokens = get().tokenize(prompt, media_paths ?? [])?.tokens
                KV.useKVStore.getState().setKvCacheTokens(tokens ?? [])
            }

            if (!(await getInfoAsync(sessionFile)).exists) {
                Logger.warn('Session file does not exist, creating...')
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
        tokenLength: async (text: string, mediaPaths: string[] = []) => {
            const finalPaths = get().mmproj ? mediaPaths : []
            if (!get().mmproj && mediaPaths.length > 0) {
                Logger.warnToast('Media was added without MMPROJ model')
            }
            const result = await get().context?.tokenizeAsync(
                text + finalPaths.map(() => RNLLAMA_MTMD_DEFAULT_MEDIA_MARKER).join(),
                {
                    media_paths: finalPaths.map((item) => item.replace('file://', '')),
                }
            )
            if (!result) return 0
            return result.tokens.length
        },
        tokenize: (text: string, media_paths: string[] = []) => {
            const params = get().mmproj ? { media_paths } : {}
            return get().context?.tokenizeSync(text, params)
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
}
