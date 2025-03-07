import { Logger } from '@lib/state/Logger'
import { mmkvStorage } from '@lib/storage/MMKV'
import * as Speech from 'expo-speech'
import { create } from 'zustand'
import { createJSONStorage, persist } from 'zustand/middleware'

type TTSState = {
    active: boolean
    activeChatIndex?: number
    voice?: Speech.Voice
    enabled: boolean
    auto: boolean
    rate: number
    startTTS: (text: string, index: number, callback?: () => void) => Promise<void>
    stopTTS: () => Promise<void>
    setEnabled: (b: boolean) => void
    setAuto: (b: boolean) => void
    setVoice: (v: Speech.Voice) => void
    setRate: (r: number) => void
}

export const useTTS = () => {
    const {
        startTTS,
        activeChatIndex,
        stopTTS,
        setVoice,
        setEnabled,
        setAuto,
        setRate,
        auto,
        enabled,
        voice,
        rate,
    } = useTTSState((state) => ({
        startTTS: state.startTTS,
        stopTTS: state.stopTTS,
        activeChatIndex: state.activeChatIndex,
        setVoice: state.setVoice,
        setEnabled: state.setEnabled,
        setAuto: state.setAuto,
        setRate: state.setRate,
        auto: state.auto,
        enabled: state.enabled,
        voice: state.voice,
        rate: state.rate,
    }))
    return {
        startTTS,
        activeChatIndex,
        stopTTS,
        setVoice,
        setEnabled,
        setAuto,
        setRate,
        auto,
        enabled,
        voice,
        rate,
    }
}

export const useTTSState = create<TTSState>()(
    persist(
        (set, get) => ({
            voice: undefined,
            enabled: false,
            auto: false,
            active: false,
            rate: 1,
            activeChatIndex: undefined,
            startTTS: async (text: string, index: number, exitCallback = () => {}) => {
                const clearIndex = () => {
                    if (get().activeChatIndex === index)
                        set((state) => ({ ...state, activeChatIndex: undefined }))
                }

                const currentSpeaker = get().voice

                Logger.info('Starting TTS')
                if (currentSpeaker === undefined) {
                    Logger.errorToast(`No Speaker Chosen`)
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

                const cleanedchunks = filteredchunks.map((item) =>
                    item.replaceAll(/[*"]/g, '').trim()
                )
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
                        rate: get().rate,
                    })
                )
                if (cleanedchunks.length === 0) clearIndex()
            },
            stopTTS: async () => {
                Logger.info('TTS stopped')
                set((state) => ({ ...state, activeChatIndex: undefined }))
                await Speech.stop()
            },
            setEnabled: (b: boolean) => {
                set((state) => ({ ...state, enabled: b }))
            },
            setAuto: (b: boolean) => {
                set((state) => ({ ...state, auto: b }))
            },
            setVoice: (v: Speech.Voice) => {
                set((state) => ({ ...state, voice: v }))
            },
            setRate: (r: number) => {
                set((state) => ({ ...state, rate: r }))
            },
        }),
        {
            name: 'tts-data-storage',
            storage: createJSONStorage(() => mmkvStorage),
            version: 1,
            partialize: (state) => ({
                enabled: state.enabled,
                auto: state.auto,
                voice: state.voice,
                rate: state.rate,
            }),
        }
    )
)
