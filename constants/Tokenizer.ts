import { copyFileRes } from '@dr.pogodin/react-native-fs'
import { initLlama, LlamaContext } from 'cui-llama.rn'
import { deleteAsync, documentDirectory, getInfoAsync } from 'expo-file-system'
import { create } from 'zustand'

import { Logger } from './Logger'

type TokenizerState = {
    model?: LlamaContext
    tokenize: (text: string) => number[]
    getTokenCount: (text: string) => number
    loadModel: () => Promise<void>
}

export namespace Tokenizer {
    export const useTokenizer = create<TokenizerState>()((set, get) => ({
        model: undefined,
        tokenize: (text: string) => {
            return get()?.model?.tokenizeSync(text)?.tokens ?? []
        },
        getTokenCount: (text: string) => {
            const tokens = get()?.model?.tokenizeSync(text)?.tokens?.length ?? 0
            return tokens
        },
        loadModel: async () => {
            if (get().model) return
            const modelExists = (
                await getInfoAsync(`${documentDirectory}appAssets/llama3tokenizer.gguf`)
            ).exists
            if (!modelExists) await importModelFromRes()

            const context = await initLlama({
                model: documentDirectory + 'appAssets/llama3tokenizer.gguf',
                vocab_only: true,
                use_mlock: true,
            })
            set((state) => ({ ...state, model: context }))
        },
    }))

    const importModelFromRes = async () => {
        Logger.log('Importing Tokenizer')
        await copyFileRes(
            'llama3tokenizer.gguf',
            documentDirectory + 'appAssets/llama3tokenizer.gguf'
        )
    }

    export const debugDeleteModel = async () => {
        await deleteAsync(documentDirectory + 'appAssets/llama3tokenizer.gguf')
    }
}

Tokenizer.useTokenizer.getState().loadModel()
