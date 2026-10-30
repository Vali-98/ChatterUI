import type { Voice } from 'expo-speech'
import { create } from 'zustand'
import { persist } from 'zustand/middleware'

import { Storage } from '@lib/constants/storageKeys'
import { createMMKVStorage } from '@lib/storage/MMKV'

type TTSSettings = {
    enabled: boolean
    auto: boolean
    liveTTS: boolean
    voice?: Voice
    rate: number
    globalPlayer: boolean
    keepPlayerOpen: boolean
    setKeepPlayerOpen: (keepPlayerOpen: boolean) => void
    setGlobalPlayer: (globalPlayer: boolean) => void
    setEnabled: (enabled: boolean) => void
    setAuto: (auto: boolean) => void
    setLiveTTS: (liveTTS: boolean) => void
    setVoice: (voice: Voice) => void
    setRate: (rate: number) => void
}

// Additive preferences inherit their defaults when older saved settings are merged.
export const useTTSSettingsStore = create<TTSSettings>()(
    persist(
        (set) => ({
            enabled: false,
            auto: false,
            liveTTS: false,
            rate: 1,
            globalPlayer: true,
            keepPlayerOpen: false,
            setKeepPlayerOpen: (keepPlayerOpen) => set({ keepPlayerOpen }),
            setGlobalPlayer: (globalPlayer) => set({ globalPlayer }),
            setEnabled: (enabled) => set({ enabled }),
            setAuto: (auto) => set(auto ? { auto: auto, liveTTS: false } : { auto }),
            setLiveTTS: (liveTTS) => set(liveTTS ? { liveTTS: liveTTS, auto: false } : { liveTTS }),
            setVoice: (voice) => set({ voice }),
            setRate: (rate) => set({ rate }),
        }),
        {
            name: Storage.TTS,
            version: 1,
            storage: createMMKVStorage(),
            partialize: ({
                enabled,
                auto,
                liveTTS,
                voice,
                rate,
                globalPlayer,
                keepPlayerOpen,
            }) => ({
                enabled,
                auto,
                liveTTS,
                voice,
                rate,
                globalPlayer,
                keepPlayerOpen,
            }),
        }
    )
)
