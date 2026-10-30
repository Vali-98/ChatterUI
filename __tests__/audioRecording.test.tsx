import { act, create, type ReactTestRenderer } from 'react-test-renderer'
import { requestRecordingPermissionsAsync, useAudioRecorder } from 'expo-audio'

import AudioRecordingSheet from '../components/media/AudioRecordingSheet'
import { convertAudioAttachment } from '../lib/audio/files'
import { stopAudioSource } from '../lib/audio/player'
import { useAudioState } from '../lib/audio/state'
import { deleteFile } from '../lib/utils/File'

jest.mock('expo-audio', () => ({
    RecordingPresets: { HIGH_QUALITY: {} },
    requestRecordingPermissionsAsync: jest.fn(),
    setAudioModeAsync: jest.fn(async () => {}),
    useAudioRecorder: jest.fn(),
    useAudioRecorderState: () => ({ durationMillis: 1000 }),
}))
jest.mock('react-i18next', () => ({ useTranslation: () => ({ t: (key: string) => key }) }))
jest.mock('../lib/audio/files', () => ({ convertAudioAttachment: jest.fn() }))
jest.mock('../lib/audio/player', () => ({ stopAudio: jest.fn(), stopAudioSource: jest.fn() }))
jest.mock('../lib/tts/player', () => ({ stopTTS: jest.fn(async () => {}) }))
jest.mock('../lib/state/Logger', () => ({
    Logger: { stackTrace: jest.fn(), warnToast: jest.fn(), errorToast: jest.fn() },
}))
jest.mock('../lib/utils/File', () => ({ deleteFile: jest.fn() }))
jest.mock('../components/media/AudioAttachment', () => ({
    __esModule: true,
    default: () => null,
}))
jest.mock('../components/views/ThemedSpinner', () => ({
    __esModule: true,
    default: () => null,
}))
jest.mock('../components/views/BottomSheet', () => ({
    __esModule: true,
    default: ({ children }: { children: React.ReactNode }) => children,
}))
jest.mock('../components/text/TText', () => ({
    __esModule: true,
    default: require('react-native').Text,
}))
jest.mock('../components/buttons/ThemedButton', () => ({
    __esModule: true,
    default: ({ label, onPress }: { label: string; onPress: () => void }) =>
        require('react').createElement(require('react-native').Pressable, {
            accessibilityLabel: label,
            onPress,
        }),
}))

let screen: ReactTestRenderer
let recorder: { uri: string; prepareToRecordAsync: jest.Mock; record: jest.Mock; stop: jest.Mock }
let attach: jest.Mock
let ref: { current: { close: jest.Mock; open: jest.Mock } }
beforeEach(async () => {
    jest.clearAllMocks()
    useAudioState.setState({ recording: false })
    recorder = {
        uri: 'file:///recording.m4a',
        prepareToRecordAsync: jest.fn(async () => {}),
        record: jest.fn(),
        stop: jest.fn(async () => {}),
    }
    jest.mocked(useAudioRecorder).mockReturnValue(recorder as never)
    jest.mocked(requestRecordingPermissionsAsync).mockResolvedValue({ granted: true } as never)
    jest.mocked(convertAudioAttachment).mockResolvedValue({
        uri: 'file:///cache/recording.wav',
        name: 'recording.wav',
        type: 'audio',
    })
    attach = jest.fn()
    ref = { current: { close: jest.fn(), open: jest.fn() } }
    await act(async () => {
        screen = create(<AudioRecordingSheet ref={ref} chatId={1} onAttach={attach} />)
    })
})
afterEach(async () => {
    await act(async () => screen.unmount())
})
const press = async (label: string) => {
    await act(async () => {
        await screen.root.findByProps({ accessibilityLabel: label }).props.onPress()
    })
}

test('permission denial never prepares the microphone', async () => {
    jest.mocked(requestRecordingPermissionsAsync).mockResolvedValue({ granted: false } as never)
    await press('audio.record')
    expect(recorder.prepareToRecordAsync).not.toHaveBeenCalled()
    expect(useAudioState.getState().recording).toBe(false)
})

test('stopping enables preview/attach and an attached recording survives sheet dismissal', async () => {
    await press('audio.record')
    expect(recorder.record).toHaveBeenCalled()
    expect(useAudioState.getState().recording).toBe(true)
    await press('audio.stopRecording')
    expect(recorder.stop).toHaveBeenCalled()
    expect(useAudioState.getState().recording).toBe(false)
    await press('audio.attach')
    expect(convertAudioAttachment).toHaveBeenCalledWith(recorder.uri, 'recording.m4a')
    expect(attach).toHaveBeenCalledWith({
        uri: 'file:///cache/recording.wav',
        name: 'recording.wav',
        type: 'audio',
    })
    await act(async () => screen.unmount())
    expect(deleteFile).toHaveBeenCalledWith(recorder.uri)
    expect(deleteFile).not.toHaveBeenCalledWith('file:///cache/recording.wav')
})

test('dismissing a preview stops that preview and discards its temporary file', async () => {
    await press('audio.record')
    await press('audio.stopRecording')
    await act(async () => screen.unmount())
    expect(stopAudioSource).toHaveBeenCalledWith('file:///cache/recording.wav')
    expect(deleteFile).toHaveBeenCalledWith(recorder.uri)
    expect(attach).not.toHaveBeenCalled()
})

test('dismissing during preparation prevents recording from starting afterward', async () => {
    let prepared!: () => void
    recorder.prepareToRecordAsync.mockReturnValueOnce(
        new Promise<void>((resolve) => {
            prepared = resolve
        })
    )
    let pending!: Promise<void>
    await act(async () => {
        pending = screen.root.findByProps({ accessibilityLabel: 'audio.record' }).props.onPress()
        await Promise.resolve()
        await Promise.resolve()
    })
    await act(async () => screen.unmount())
    await act(async () => {
        prepared()
        await pending
    })
    expect(recorder.record).not.toHaveBeenCalled()
    expect(deleteFile).toHaveBeenCalledWith(recorder.uri)
    expect(useAudioState.getState().recording).toBe(false)
})

test('closing during conversion waits to delete the source and discards the resulting WAV', async () => {
    let converted!: (value: Awaited<ReturnType<typeof convertAudioAttachment>>) => void
    jest.mocked(convertAudioAttachment).mockReturnValueOnce(
        new Promise((resolve) => {
            converted = resolve
        })
    )
    await press('audio.record')
    let pending!: Promise<void>
    await act(async () => {
        pending = screen.root
            .findByProps({ accessibilityLabel: 'audio.stopRecording' })
            .props.onPress()
        await Promise.resolve()
        await Promise.resolve()
    })
    await act(async () => screen.unmount())
    expect(deleteFile).not.toHaveBeenCalledWith(recorder.uri)
    await act(async () => {
        converted({ uri: 'file:///cache/recording.wav', name: 'recording.wav', type: 'audio' })
        await pending
    })
    expect(deleteFile).toHaveBeenCalledWith(recorder.uri)
    expect(deleteFile).toHaveBeenCalledWith('file:///cache/recording.wav')
    expect(attach).not.toHaveBeenCalled()
})

test('failed conversion does not attach the source as if it were a WAV', async () => {
    jest.mocked(convertAudioAttachment).mockRejectedValueOnce(new Error('Unsupported codec'))
    await press('audio.record')
    await press('audio.stopRecording')
    expect(attach).not.toHaveBeenCalled()
    expect(deleteFile).not.toHaveBeenCalledWith(recorder.uri)
    await act(async () => screen.unmount())
    expect(deleteFile).toHaveBeenCalledWith(recorder.uri)
})
