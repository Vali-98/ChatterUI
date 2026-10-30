import { convertToWav } from '@vali98/react-native-png-utils'
import { randomUUID } from 'expo-crypto'
import { getDocumentAsync } from 'expo-document-picker'
import { Directory } from 'expo-file-system'

import { convertAudioAttachment, pickAudioAttachments } from '../lib/audio/files'
import { deleteFile } from '../lib/utils/File'

jest.mock('@vali98/react-native-png-utils', () => ({ convertToWav: jest.fn() }))
jest.mock('expo-crypto', () => ({ randomUUID: jest.fn() }))
jest.mock('expo-document-picker', () => ({ getDocumentAsync: jest.fn() }))
jest.mock('expo-file-system', () => ({
    Paths: { cache: { uri: 'file:///cache/' } },
    Directory: jest.fn().mockImplementation((parent, name) => ({
        uri: `${parent.uri}${name}/`,
        create: jest.fn(),
        delete: jest.fn(),
    })),
}))
jest.mock('../lib/utils/File', () => ({ deleteFile: jest.fn() }))

beforeEach(() => {
    jest.clearAllMocks()
    let id = 0
    jest.mocked(randomUUID).mockImplementation(() => `unique-${++id}`)
    jest.mocked(convertToWav).mockImplementation(async (_input, uri) => ({
        uri,
        path: '',
        sampleRate: 16000,
        channels: 1,
        frames: 16000,
        durationSeconds: 1,
        bytes: 32044,
    }))
})

test.each(['my clip.mp3', 'my clip.wav'])(
    'normalizes %s to a uniquely owned cache WAV without replacing the source',
    async (name) => {
        const result = await convertAudioAttachment('file:///picked/source', name)
        expect(convertToWav).toHaveBeenCalledWith(
            'file:///picked/source',
            'file:///cache/audio-unique-1/my%20clip.wav'
        )
        expect(result).toEqual({
            uri: 'file:///cache/audio-unique-1/my%20clip.wav',
            name: 'my clip.wav',
            type: 'audio',
        })
        expect(deleteFile).not.toHaveBeenCalled()
    }
)

test('a codec failure cleans the conversion directory and leaves the input alone', async () => {
    jest.mocked(convertToWav).mockRejectedValueOnce(new Error('Unsupported codec'))
    await expect(
        convertAudioAttachment('file:///picked/audio.unknown', 'audio.unknown')
    ).rejects.toThrow('Unsupported codec')
    const directory = jest.mocked(Directory).mock.results[0].value
    expect(directory.delete).toHaveBeenCalled()
    expect(deleteFile).not.toHaveBeenCalled()
})

test('a failed multi-file selection cleans successful conversions instead of returning a partial selection', async () => {
    jest.mocked(getDocumentAsync).mockResolvedValue({
        canceled: false,
        assets: [
            { uri: 'file:///picked/one.mp3', name: 'one.mp3' },
            { uri: 'file:///picked/two.bad', name: 'two.bad' },
        ],
    } as never)
    jest.mocked(convertToWav)
        .mockResolvedValueOnce({ uri: 'file:///cache/audio-unique-1/one.wav' } as never)
        .mockRejectedValueOnce(new Error('Unsupported codec'))
    await expect(pickAudioAttachments()).rejects.toThrow('Unsupported codec')
    expect(deleteFile).toHaveBeenCalledWith('file:///cache/audio-unique-1/one.wav')
    expect(deleteFile).not.toHaveBeenCalledWith('file:///picked/one.mp3')
    expect(deleteFile).not.toHaveBeenCalledWith('file:///picked/two.bad')
})

test('canceling the file picker creates no conversion files', async () => {
    const onPrepare = jest.fn()
    jest.mocked(getDocumentAsync).mockResolvedValue({ canceled: true, assets: null })
    expect(await pickAudioAttachments({ onPrepare })).toEqual([])
    expect(onPrepare).not.toHaveBeenCalled()
    expect(convertToWav).not.toHaveBeenCalled()
})
