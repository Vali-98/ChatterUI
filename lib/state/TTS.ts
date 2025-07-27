import { Storage } from '@lib/enums/Storage'
import { Logger } from '@lib/state/Logger'
import { createMMKVStorage } from '@lib/storage/MMKV'
import * as Speech from 'expo-speech'
import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { useShallow } from 'zustand/react/shallow'

import { Chats, useInference } from './Chat'

type TTSState = {
    activeChatIndex?: number
    voice?: Speech.Voice
    enabled: boolean
    auto: boolean
    rate: number
    startTTS: (text: string, index: number) => Promise<void>
    stopTTS: () => Promise<void>
    setEnabled: (b: boolean) => void
    setAuto: (b: boolean) => void
    setVoice: (v: Speech.Voice) => void
    setRate: (r: number) => void
    setLiveTTS: (b: boolean) => void

    speak: (text: string, onDone?: () => void, onStop?: () => void) => void
    handleEndGeneration: (lastIndex: number, text: string) => Promise<void>
    handleStartGeneration: (lastIndex: number) => void
    // stream TTS
    liveTTS: boolean
    pauseLive?: boolean
    setPauseLive: (b: boolean) => void
    buffer: string
    clearAndRunBuffer: (lastIndex: number) => void
    clearBuffer: () => void
    /**
     * Inserts text into the buffer, attempts TTS if valid sentence and adds remainder to buffer
     * @param text text for TTS
     * @returns
     */
    insertBuffer: (text: string) => void
}

const sentenceEndRegex =
    /(?<=[^\d])([。…？！.?!])(?:["'`*_)]*)\s+(?=[A-Z0-9])|([。…？！.?!])(?:["'`*_)]*)$/gm

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
        live,
        setLive,
    } = useTTSStore(
        useShallow((state) => ({
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
            live: state.liveTTS,
            setLive: state.setLiveTTS,
        }))
    )
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
        live,
        setLive,
    }
}

useInference.subscribe(({ nowGenerating }) => {
    const data = Chats.useChatState.getState().data
    const length = data?.messages?.length
    if (!length) return
    if (!nowGenerating) {
        const message = data?.messages?.[length - 1]
        if (!message) return
        useTTSStore
            .getState()
            .handleEndGeneration(length - 1, message.swipes[message.swipe_id].swipe)
    } else {
        useTTSStore.getState().handleStartGeneration(length - 1)
    }
})

export const useTTSStore = create<TTSState>()(
    persist(
        (set, get) => ({
            voice: undefined,
            enabled: false,
            auto: false,
            liveTTS: false,
            rate: 1,
            activeChatIndex: undefined,
            startTTS: async (text: string, index: number) => {
                const clearIndex = () => {
                    if (get().activeChatIndex === index) set({ activeChatIndex: undefined })
                }

                const currentSpeaker = get().voice

                Logger.info('Starting TTS')
                if (currentSpeaker === undefined) {
                    Logger.errorToast(`No Speaker Chosen`)
                    clearIndex()
                    return
                }
                if (await Speech.isSpeakingAsync()) await Speech.stop()
                const filter = /([。…！？、!?.,*"])/
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
                set({ activeChatIndex: index })
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
                set({ buffer: '', activeChatIndex: undefined, pauseLive: get().liveTTS })
                await Speech.stop()
            },
            setEnabled: (b: boolean) => {
                set({ enabled: b })
            },
            setAuto: (b: boolean) => {
                set({ auto: b })
            },
            setVoice: (v: Speech.Voice) => {
                set({ voice: v })
            },
            setRate: (r: number) => {
                set({ rate: r })
            },
            setLiveTTS: (b: boolean) => {
                set({ liveTTS: b })
            },
            setPauseLive: (b: boolean) => {
                set({ pauseLive: b })
            },
            speak: (text, onDone = () => {}, onStop = () => {}) => {
                const currentSpeaker = get().voice
                Speech.speak(text, {
                    language: currentSpeaker?.language,
                    voice: currentSpeaker?.identifier,
                    onDone: onDone,
                    onStopped: onStop,
                    rate: get().rate,
                })
            },

            handleEndGeneration: async (lastIndex, text) => {
                if (!get().enabled) return
                if (get().liveTTS) {
                    get().clearAndRunBuffer(lastIndex)
                } else if (get().auto) {
                    await get().stopTTS()
                    get().startTTS(text, lastIndex)
                }
            },

            handleStartGeneration: async (lastIndex) => {
                if (get().enabled && get().liveTTS) {
                    await Speech.stop()
                    set({ activeChatIndex: lastIndex })
                }
                set({ pauseLive: false })
            },

            // Stream Data

            buffer: '',
            clearAndRunBuffer: (lastIndex) => {
                const buffer = get().buffer

                if (!get().pauseLive && buffer.trim()) {
                    const clean = cleanMarkdown(buffer)
                    if (clean) {
                        set({ activeChatIndex: lastIndex })
                        get().speak(clean, () => set({ activeChatIndex: undefined }))
                    }
                } else {
                    set({ activeChatIndex: undefined })
                }
                set({ buffer: '' })
            },
            clearBuffer: () => {
                set({ buffer: '' })
            },
            insertBuffer: (text: string) => {
                if (!get().enabled || !get().liveTTS || get().pauseLive) return
                const newBuffer = get().buffer + text

                let lastMatchIndex = -1
                let match

                while ((match = sentenceEndRegex.exec(newBuffer)) !== null) {
                    lastMatchIndex = sentenceEndRegex.lastIndex
                }

                if (lastMatchIndex !== -1) {
                    const fullSentence = newBuffer.slice(0, lastMatchIndex).trim()
                    const remainder = newBuffer.slice(lastMatchIndex)
                    const clean = cleanMarkdown(fullSentence)
                    if (clean) {
                        get().speak(clean)
                    }
                    set({ buffer: remainder })
                } else {
                    set({ buffer: newBuffer })
                }
            },
        }),
        {
            name: Storage.TTS,
            storage: createMMKVStorage(),
            version: 1,
            partialize: (state) => ({
                enabled: state.enabled,
                auto: state.auto,
                voice: state.voice,
                rate: state.rate,
                liveTTS: state.liveTTS,
            }),
        }
    )
)

const cleanMarkdown = (text: string): string => {
    const result = text.replace(/([*_]{1,2}|`|\[\^.*?\]\(.*?\)|<\/?[^>]+>)/g, '')
    return result
}
