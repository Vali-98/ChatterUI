import * as Speech from 'expo-speech'
import { create } from 'zustand'

import { Global } from './GlobalValues'
import { Logger } from './Logger'
import { mmkv } from './MMKV'

type TTSState = {
    active: boolean
    activeChatIndex?: number
    startTTS: (text: string, index: number, callback?: () => void) => Promise<void>
    stopTTS: () => Promise<void>
}

export const useTTS = () => {
    const { startTTS, activeChatIndex, stopTTS } = useTTSState((state) => ({
        startTTS: state.startTTS,
        stopTTS: state.stopTTS,
        activeChatIndex: state.activeChatIndex,
    }))
    return { startTTS, activeChatIndex, stopTTS }
}

export const useTTSState = create<TTSState>()((set, get) => ({
    active: false,
    activeChatIndex: undefined,
    startTTS: async (text: string, index: number, exitCallback = () => {}) => {
        const clearIndex = () => {
            if (get().activeChatIndex === index)
                set((state) => ({ ...state, activeChatIndex: undefined }))
        }

        const currentSpeakerString = mmkv.getString(Global.TTSSpeaker)
        if (!currentSpeakerString) {
            Logger.log('Invalid Speaker', true)
            clearIndex()
            return
        }
        const currentSpeaker: Speech.Voice = JSON.parse(currentSpeakerString)

        Logger.log('Starting TTS')
        if (currentSpeaker === undefined) {
            Logger.log(`No Speaker Chosen`, true)
            clearIndex()
            return
        }
        if (await Speech.isSpeakingAsync()) await Speech.stop()
        const filter = /([!?.,*"])/
        const filteredchunks: string[] = []
        const chunks = text.split(filter)
        chunks.forEach((item, index) => {
            if (!filter.test(item) && item) return filteredchunks.push(item)
            if (index > 0)
                filteredchunks[filteredchunks.length - 1] =
                    filteredchunks[filteredchunks.length - 1] + item
        })
        if (filteredchunks.length === 0) filteredchunks.push(text)

        const cleanedchunks = filteredchunks.map((item) => item.replaceAll(/[*"]/g, '').trim())
        Logger.debug('TTS started with ' + cleanedchunks.length + ' chunks')
        set((state) => ({ ...state, activeChatIndex: index }))
        cleanedchunks.forEach((chunk, index) =>
            Speech.speak(chunk, {
                language: currentSpeaker?.language,
                voice: currentSpeaker?.identifier,
                onDone: () => {
                    index === cleanedchunks.length - 1 && clearIndex()
                },
                onStopped: () => clearIndex(),
            })
        )
        if (cleanedchunks.length === 0) clearIndex()
    },
    stopTTS: async () => {
        Logger.log('TTS stopped')
        set((state) => ({ ...state, activeChatIndex: undefined }))
        await Speech.stop()
    },
}))
