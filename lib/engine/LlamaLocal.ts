import { db } from '@db'
import { CompletionParams, ContextParams, LlamaContext, initLlama } from 'cui-llama.rn'
import { model_data, ModelDataType } from 'db/schema'
import { eq } from 'drizzle-orm'
import { getDocumentAsync } from 'expo-document-picker'
import * as FS from 'expo-file-system'
import { create } from 'zustand'

import { AppSettings, Global } from '../constants/GlobalValues'
import { Logger } from '../storage/Logger'
import { mmkv } from '../storage/MMKV'

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
    load: (model: ModelDataType) => Promise<void>
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
        modelName: undefined,
        modelId: undefined,
        loadProgress: 0,
        model: undefined,
        load: async (model: ModelDataType) => {
            const presetString = mmkv.getString(Global.LocalPreset)
            if (!presetString) return
            const preset: LlamaPreset = JSON.parse(presetString)

            if (get()?.model?.id === model.id) {
                return Logger.log('Model Already Loaded!', true)
            }

            if (checkGGMLDeprecated(model)) {
                return Logger.log('Quantization No Longer Supported!', true)
            }

            if (!(await FS.getInfoAsync(model.file_path)).exists) {
                Logger.log('Model Does Not Exist!', true)
                return
            }

            if (get().context !== undefined) {
                await get().unload()
            }

            const params: ContextParams = {
                model: model.file_path,
                n_ctx: preset.context_length,
                n_threads: preset.threads,
                n_batch: preset.batch,
            }

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
            Logger.log(`Current KV Size is: ${readableFileSize(await getKVSize())}`)
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

    export const deleteModelById = async (id: number) => {
        const modelInfo = await db.query.model_data.findFirst({ where: eq(model_data.id, id) })
        if (!modelInfo) return
        if (modelInfo.id === useLlama.getState()?.model?.id) await useLlama.getState().unload()
        // some models may be external
        if (modelInfo.file_path.startsWith(model_dir)) await deleteModel(modelInfo.file)
        await db.delete(model_data).where(eq(model_data.id, id))
    }

    /**
     * @deprecated
     */
    export const deleteModel = async (name: string) => {
        if (!(await modelExists(name))) return
        if (name === useLlama.getState()?.model?.name) await useLlama.getState().unload()
        return await FS.deleteAsync(`${model_dir}${name}`)
    }

    export const importModel = async () => {
        return getDocumentAsync({
            copyToCacheDirectory: false,
        }).then(async (result) => {
            if (result.canceled) return
            const file = result.assets[0]
            const name = file.name
            const newdir = `${model_dir}${name}`
            Logger.log('Importing file...', true)

            const success = await FS.copyAsync({
                from: file.uri,
                to: newdir,
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
            if (await createModelData(name, true)) Logger.log(`Model Imported Sucessfully!`, true)
        })
    }

    export const linkModelExternal = async () => {
        return getDocumentAsync({
            copyToCacheDirectory: false,
        }).then(async (result) => {
            if (result.canceled) return
            const file = result.assets[0]
            Logger.log('Importing file...', true)
            if (!file) {
                Logger.log('File Invalid')
                return
            }
            // database routine here
            if (await createModelDataExternal(file.uri, file.name, true))
                Logger.log(`Model Imported Sucessfully!`, true)
        })
    }

    type ModelData = Omit<ModelDataType, 'id' | 'create_date' | 'last_modified'>

    const initialModelEntry = (filename: string, file_path: string) => ({
        context_length: 0,
        file: filename,
        file_path: file_path,
        name: 'N/A',
        file_size: 0,
        params: 'N/A',
        quantization: '-1',
        architecture: 'N/A',
    })

    export const createModelData = async (filename: string, deleteOnFailure: boolean = false) => {
        return setModelDataInternal(filename, `${model_dir}${filename}`, deleteOnFailure)
    }

    export const createModelDataExternal = async (
        newdir: string,
        filename: string,
        deleteOnFailure: boolean = false
    ) => {
        if (!filename) {
            Logger.log('Filename invalid, Import Failed', true)
            return
        }
        return setModelDataInternal(filename, newdir, deleteOnFailure)
    }

    const setModelDataInternal = async (
        filename: string,
        file_path: string,
        deleteOnFailure: boolean
    ) => {
        try {
            const [{ id }, ...rest] = await db
                .insert(model_data)
                .values(initialModelEntry(filename, file_path))
                .returning({ id: model_data.id })

            const modelContext = await initLlama({ model: file_path, vocab_only: true })
            const modelInfo: any = modelContext.model
            const modelType = modelInfo.metadata?.['general.architecture']
            const modelDataEntry = {
                context_length: modelInfo.metadata?.[modelType + '.context_length'] ?? 0,
                file: filename,
                file_path: file_path,
                name: modelInfo.metadata?.['general.name'] ?? 'N/A',
                file_size: modelInfo.size ?? 0,
                params: modelInfo.metadata?.['general.size_label'] ?? 'N/A',
                quantization: modelInfo.metadata?.['general.file_type'] ?? '-1',
                architecture: modelType ?? 'N/A',
            }
            Logger.log(`New Model Data:\n${modelDataText(modelDataEntry)}`)
            await modelContext.release()
            await db.update(model_data).set(modelDataEntry).where(eq(model_data.id, id))
            return true
        } catch (e) {
            Logger.log(`Failed to create data: ${e}`, true)
            if (deleteOnFailure) FS.deleteAsync(file_path, { idempotent: true })
            return false
        }
    }

    export const verifyModelList = async () => {
        let modelList = await db.query.model_data.findMany()
        const fileList = await getModelList()

        // cull missing models
        modelList.forEach(async (item) => {
            if (item.name === '' || !(await FS.getInfoAsync(item.file_path)).exists) {
                Logger.log(`Model Missing, its entry will be deleted: ${item.name}`)
                await db.delete(model_data).where(eq(model_data.id, item.id))
            }
        })
        // refresh as some may have been deleted
        modelList = await db.query.model_data.findMany()

        // create data as migration step
        fileList.forEach(async (item) => {
            if (modelList.some((model_data) => model_data.file === item)) return
            await createModelData(`${item}`)
        })
    }

    export const getKVSize = async () => {
        const data = await FS.getInfoAsync(sessionFile)
        return data.exists ? data.size : 0
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

    export const getModelListQuery = () => {
        return db.query.model_data.findMany()
    }

    export const modelDataText = (data: ModelData) => {
        const quantValue = data.quantization ?? ''

        //@ts-ignore
        const quantType = GGMLNameMap[quantValue]

        return `Context length: ${data.context_length ?? 'N/A'}\nFile: ${data.file}\nName: ${data.name ?? 'N/A'}\nSize: ${(data.file_size && readableFileSize(data.file_size)) ?? 'N/A'}\nParams: ${data.params ?? 'N/A'}\nQuantization: ${quantType ?? 'N/A'}\nArchitecture: ${data.architecture ?? 'N/A'}`
    }

    export const updateName = async (name: string, id: number) => {
        await db.update(model_data).set({ name: name }).where(eq(model_data.id, id))
    }

    export const isInitialEntry = (data: ModelData) => {
        const initial: ModelData = {
            file: '',
            file_path: '',
            context_length: 0,
            name: 'N/A',
            file_size: 0,
            params: 'N/A',
            quantization: '-1',
            architecture: 'N/A',
        }

        for (const key in initial) {
            if (key === 'file' || key === 'file_path') continue
            const initialV = initial[key as keyof ModelData]
            const dataV = data[key as keyof ModelData]
            if (initialV !== dataV) return false
        }
        return true
    }
}

enum GGMLType {
    UNKNOWN = -1,
    LLAMA_FTYPE_ALL_F32 = 0,
    LLAMA_FTYPE_MOSTLY_F16 = 1,
    LLAMA_FTYPE_MOSTLY_Q4_0 = 2,
    LLAMA_FTYPE_MOSTLY_Q4_1 = 3,
    // LLAMA_FTYPE_MOSTLY_Q4_1_SOME_F16 = 4,
    // LLAMA_FTYPE_MOSTLY_Q4_2       = 5,
    // LLAMA_FTYPE_MOSTLY_Q4_3       = 6,
    LLAMA_FTYPE_MOSTLY_Q8_0 = 7,
    LLAMA_FTYPE_MOSTLY_Q5_0 = 8,
    LLAMA_FTYPE_MOSTLY_Q5_1 = 9,
    LLAMA_FTYPE_MOSTLY_Q2_K = 10,
    LLAMA_FTYPE_MOSTLY_Q3_K_S = 11,
    LLAMA_FTYPE_MOSTLY_Q3_K_M = 12,
    LLAMA_FTYPE_MOSTLY_Q3_K_L = 13,
    LLAMA_FTYPE_MOSTLY_Q4_K_S = 14,
    LLAMA_FTYPE_MOSTLY_Q4_K_M = 15,
    LLAMA_FTYPE_MOSTLY_Q5_K_S = 16,
    LLAMA_FTYPE_MOSTLY_Q5_K_M = 17,
    LLAMA_FTYPE_MOSTLY_Q6_K = 18,
    LLAMA_FTYPE_MOSTLY_IQ2_XXS = 19,
    LLAMA_FTYPE_MOSTLY_IQ2_XS = 20,
    LLAMA_FTYPE_MOSTLY_Q2_K_S = 21,
    LLAMA_FTYPE_MOSTLY_IQ3_XS = 22,
    LLAMA_FTYPE_MOSTLY_IQ3_XXS = 23,
    LLAMA_FTYPE_MOSTLY_IQ1_S = 24,
    LLAMA_FTYPE_MOSTLY_IQ4_NL = 25,
    LLAMA_FTYPE_MOSTLY_IQ3_S = 26,
    LLAMA_FTYPE_MOSTLY_IQ3_M = 27,
    LLAMA_FTYPE_MOSTLY_IQ2_S = 28,
    LLAMA_FTYPE_MOSTLY_IQ2_M = 29,
    LLAMA_FTYPE_MOSTLY_IQ4_XS = 30,
    LLAMA_FTYPE_MOSTLY_IQ1_M = 31,
    LLAMA_FTYPE_MOSTLY_BF16 = 32,
    LLAMA_FTYPE_MOSTLY_Q4_0_4_4 = 33,
    LLAMA_FTYPE_MOSTLY_Q4_0_4_8 = 34,
    LLAMA_FTYPE_MOSTLY_Q4_0_8_8 = 35,
    LLAMA_FTYPE_MOSTLY_TQ1_0 = 36,
    LLAMA_FTYPE_MOSTLY_TQ2_0 = 37,
}

export const GGMLNameMap = {
    [GGMLType.UNKNOWN]: 'N/A',
    [GGMLType.LLAMA_FTYPE_ALL_F32]: 'F32',
    [GGMLType.LLAMA_FTYPE_MOSTLY_F16]: 'F16',
    [GGMLType.LLAMA_FTYPE_MOSTLY_Q4_0]: 'Q4_0',
    [GGMLType.LLAMA_FTYPE_MOSTLY_Q4_1]: 'Q4_1',
    [GGMLType.LLAMA_FTYPE_MOSTLY_Q8_0]: 'Q8_0',
    [GGMLType.LLAMA_FTYPE_MOSTLY_Q5_0]: 'Q5_0',
    [GGMLType.LLAMA_FTYPE_MOSTLY_Q5_1]: 'Q5_1',
    [GGMLType.LLAMA_FTYPE_MOSTLY_Q2_K]: 'Q2_K',
    [GGMLType.LLAMA_FTYPE_MOSTLY_Q3_K_S]: 'Q3_K_S',
    [GGMLType.LLAMA_FTYPE_MOSTLY_Q3_K_M]: 'Q3_K_M',
    [GGMLType.LLAMA_FTYPE_MOSTLY_Q3_K_L]: 'Q3_K_L',
    [GGMLType.LLAMA_FTYPE_MOSTLY_Q4_K_S]: 'Q4_K_S',
    [GGMLType.LLAMA_FTYPE_MOSTLY_Q4_K_M]: 'Q4_K_M',
    [GGMLType.LLAMA_FTYPE_MOSTLY_Q5_K_S]: 'Q5_K_S',
    [GGMLType.LLAMA_FTYPE_MOSTLY_Q5_K_M]: 'Q5_K_M',
    [GGMLType.LLAMA_FTYPE_MOSTLY_Q6_K]: 'Q6_K',
    [GGMLType.LLAMA_FTYPE_MOSTLY_IQ2_XXS]: 'IQ2_XXS',
    [GGMLType.LLAMA_FTYPE_MOSTLY_IQ2_XS]: 'IQ2_XS',
    [GGMLType.LLAMA_FTYPE_MOSTLY_Q2_K_S]: 'Q2_K_S',
    [GGMLType.LLAMA_FTYPE_MOSTLY_IQ3_XS]: 'IQ3_XS',
    [GGMLType.LLAMA_FTYPE_MOSTLY_IQ3_XXS]: 'IQ3_XXS',
    [GGMLType.LLAMA_FTYPE_MOSTLY_IQ1_S]: 'IQ1_S',
    [GGMLType.LLAMA_FTYPE_MOSTLY_IQ4_NL]: 'IQ4_NL',
    [GGMLType.LLAMA_FTYPE_MOSTLY_IQ3_S]: 'IQ3_S',
    [GGMLType.LLAMA_FTYPE_MOSTLY_IQ3_M]: 'IQ3_M',
    [GGMLType.LLAMA_FTYPE_MOSTLY_IQ2_S]: 'IQ2_S',
    [GGMLType.LLAMA_FTYPE_MOSTLY_IQ2_M]: 'IQ2_M',
    [GGMLType.LLAMA_FTYPE_MOSTLY_IQ4_XS]: 'IQ4_XS',
    [GGMLType.LLAMA_FTYPE_MOSTLY_IQ1_M]: 'IQ1_M',
    [GGMLType.LLAMA_FTYPE_MOSTLY_BF16]: 'BF16',
    [GGMLType.LLAMA_FTYPE_MOSTLY_Q4_0_4_4]: 'Q4_0_4_4',
    [GGMLType.LLAMA_FTYPE_MOSTLY_Q4_0_4_8]: 'Q4_0_4_8',
    [GGMLType.LLAMA_FTYPE_MOSTLY_Q4_0_8_8]: 'Q4_0_8_8',
    [GGMLType.LLAMA_FTYPE_MOSTLY_TQ1_0]: 'TQ1_0',
    [GGMLType.LLAMA_FTYPE_MOSTLY_TQ2_0]: 'TQ2_0',
}

const gb = 1000 ** 3
const mb = 1000 ** 2

/**
 * Gets a human friendly version of file size
 * @param size size in bytes
 * @returns string containing readable file size
 */
export const readableFileSize = (size: number) => {
    if (size < gb) {
        const sizeInMB = size / mb
        return `${sizeInMB.toFixed(2)} MB`
    } else {
        const sizeInGB = size / gb
        return `${sizeInGB.toFixed(2)} GB`
    }
}

const checkGGMLDeprecated = (model: ModelDataType) => {
    const type = parseInt(model.quantization)
    return (
        type === GGMLType.LLAMA_FTYPE_MOSTLY_Q4_0_4_4 ||
        type === GGMLType.LLAMA_FTYPE_MOSTLY_Q4_0_4_8 ||
        type === GGMLType.LLAMA_FTYPE_MOSTLY_Q4_0_8_8
    )
}
