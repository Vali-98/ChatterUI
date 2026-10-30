import { Storage } from '../lib/constants/storageKeys'
import { useTTSSettingsStore } from '../lib/tts/settingsStore'

jest.mock('../lib/storage/MMKV', () => ({
    createMMKVStorage: () => ({ getItem: () => null, setItem: jest.fn(), removeItem: jest.fn() }),
}))

const initialOptions = useTTSSettingsStore.persist.getOptions()
beforeEach(() => {
    useTTSSettingsStore.persist.setOptions(initialOptions)
    useTTSSettingsStore.setState(useTTSSettingsStore.getInitialState(), true)
    jest.clearAllMocks()
})

test('existing version-one voice and automatic playback preferences are preserved', async () => {
    const preferences = {
        enabled: true,
        auto: false,
        liveTTS: true,
        rate: 1.4,
        voice: {
            identifier: 'saved-voice',
            language: 'en-US',
            name: 'Saved voice',
            quality: 'Default',
        },
    }
    const getItem = jest.fn(() => ({ state: preferences, version: 1 }))
    useTTSSettingsStore.persist.setOptions({
        storage: { getItem: getItem as any, setItem: jest.fn(), removeItem: jest.fn() },
    })
    await useTTSSettingsStore.persist.rehydrate()
    expect(getItem).toHaveBeenCalledWith(Storage.TTS)
    expect(useTTSSettingsStore.getState()).toMatchObject({
        ...preferences,
        globalPlayer: true,
        keepPlayerOpen: false,
    })
})

test('automatic modes are mutually exclusive at the store boundary', () => {
    useTTSSettingsStore.getState().setAuto(true)
    expect(useTTSSettingsStore.getState()).toMatchObject({ auto: true, liveTTS: false })
    useTTSSettingsStore.getState().setLiveTTS(true)
    expect(useTTSSettingsStore.getState()).toMatchObject({ auto: false, liveTTS: true })
})

test('new player preferences are persisted alongside existing settings', () => {
    const setItem = jest.fn()
    useTTSSettingsStore.persist.setOptions({
        storage: { getItem: () => null, setItem, removeItem: jest.fn() },
    })
    useTTSSettingsStore.getState().setGlobalPlayer(false)
    useTTSSettingsStore.getState().setKeepPlayerOpen(true)
    expect(setItem).toHaveBeenLastCalledWith(
        Storage.TTS,
        expect.objectContaining({
            state: expect.objectContaining({ globalPlayer: false, keepPlayerOpen: true }),
        })
    )
})
