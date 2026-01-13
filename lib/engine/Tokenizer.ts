import { initLlama, LlamaContext } from 'cui-llama.rn'
import { Asset } from 'expo-asset'
import { create } from 'zustand'

import { useAppModeStore } from '@lib/state/AppMode'
import { Logger } from '@lib/state/Logger'
import { AppDirectory, copyFile, fileExists } from '@lib/utils/File'

import { Llama } from './Local/LlamaLocal'

type TokenizerState = {
    model?: LlamaContext
    tokenize: (text: string) => Promise<number[]>
    getTokenCount: (text: string, image_urls?: string[]) => Promise<number>
    loadModel: () => Promise<void>
}

const tokenizerModelDir = `${AppDirectory.Assets}llama3tokenizer.gguf`

export namespace Tokenizer {
    export const useTokenizerState = create<TokenizerState>()((set, get) => ({
        model: undefined,
        tokenize: async (text: string) => {
            return (await get()?.model?.tokenize(text))?.tokens ?? []
        },
        // name this for trace stack
        getTokenCount: async function getTokenCount(text: string, image_urls: string[] = []) {
            const model = get().model
            if (!model) {
                Logger.warn('Tokenizer not loaded')
                return 0
            }
            return (await model.tokenize(text)).tokens.length + image_urls.length * 512
        },
        loadModel: async () => {
            if (get().model) return
            try {
                await importModelFromRes().catch((e) => {
                    Logger.error('Could not import Tokenizer: ' + e)
                })
                Logger.info('Loading Tokenizer')
                const context = await initLlama({
                    model: tokenizerModelDir,
                    vocab_only: true,
                    n_gpu_layers: 0,
                    devices: [],
                })
                Logger.info('Tokenizer Loaded')
                set({ model: context })
            } catch (e) {
                Logger.error('Failed to load tokenizer: ' + e)
            }
        },
    }))

    const importModelFromRes = async () => {
        if (fileExists(tokenizerModelDir)) return
        Logger.info('Importing Tokenizer')
        const [asset] = await Asset.loadAsync(require('./../../assets/models/llama3tokenizer.gguf'))
        await asset.downloadAsync()
        if (asset.localUri) copyFile({ from: asset.localUri, to: tokenizerModelDir })
    }

    export const getTokenizer = () => {
        return useAppModeStore.getState().appMode === 'local'
            ? Llama.useLlamaModelStore.getState().tokenLength
            : Tokenizer.useTokenizerState.getState().getTokenCount
    }

    export const useTokenizer = () => {
        const defaultTokenizer = useTokenizerState((state) => state.getTokenCount)
        const llamaTokenizer = Llama.useLlamaModelStore((state) => state.tokenLength)
        const appMode = useAppModeStore((state) => state.appMode)
        return appMode === 'local' ? llamaTokenizer : defaultTokenizer
    }
}
