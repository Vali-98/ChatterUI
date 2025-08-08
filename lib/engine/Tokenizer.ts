import { useAppModeStore } from '@lib/state/AppMode'
import { Logger } from '@lib/state/Logger'
import { initLlama, LlamaContext } from 'cui-llama.rn'
import { Asset } from 'expo-asset'
import {
    copyAsync,
    deleteAsync,
    documentDirectory,
    getInfoAsync,
    makeDirectoryAsync,
} from 'expo-file-system'
import { create } from 'zustand'

import { Llama } from './Local/LlamaLocal'

type TokenizerState = {
    model?: LlamaContext
    tokenize: (text: string) => number[]
    getTokenCount: (text: string, image_urls?: string[]) => number
    loadModel: () => Promise<void>
}

export namespace Tokenizer {
    export const useTokenizerState = create<TokenizerState>()((set, get) => ({
        model: undefined,
        tokenize: (text: string) => {
            return get()?.model?.tokenizeSync(text)?.tokens ?? []
        },
        // name this for trace stack
        getTokenCount: function getTokenCount(text: string, image_urls: string[] = []) {
            const model = get().model
            if (!model) {
                Logger.warn('Tokenizer not loaded')
                return 0
            }
            return model.tokenizeSync(text).tokens.length + image_urls.length * 512
        },
        loadModel: async () => {
            if (get().model) return

            await importModelFromRes().catch((e) => {
                Logger.error('Could not import Tokenizer: ' + e)
            })

            const context = await initLlama({
                model: documentDirectory + 'appAssets/llama3tokenizer.gguf',
                vocab_only: true,
                use_mlock: true,
            })
            set((state) => ({ ...state, model: context }))
        },
    }))

    const importModelFromRes = async () => {
        const folderDir = `${documentDirectory}appAssets/`
        const folderExists = (await getInfoAsync(folderDir)).exists
        if (!folderExists) await makeDirectoryAsync(`${documentDirectory}appAssets`)
        const modelDir = `${folderDir}llama3tokenizer.gguf`
        const modelExists = (await getInfoAsync(modelDir)).exists
        if (modelExists) return
        Logger.info('Importing Tokenizer')
        const [asset] = await Asset.loadAsync(require('./../../assets/models/llama3tokenizer.gguf'))
        await asset.downloadAsync()
        if (asset.localUri) await copyAsync({ from: asset.localUri, to: modelDir })
    }

    export const debugDeleteModel = async () => {
        await deleteAsync(documentDirectory + 'appAssets')
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
