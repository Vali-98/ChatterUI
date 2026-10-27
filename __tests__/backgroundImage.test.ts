import { getDocumentAsync } from 'expo-document-picker'

import { useBackgroundStore } from '../lib/state/BackgroundImage'
import { copyFile, deleteFile } from '../lib/utils/File'

jest.mock('expo-crypto', () => ({ randomUUID: jest.fn(() => 'unique') }))
jest.mock('expo-document-picker', () => ({ getDocumentAsync: jest.fn() }))
jest.mock('i18next', () => ({ t: (key: string) => key }))
jest.mock('../lib/state/Logger', () => ({
    Logger: { infoToast: jest.fn(), errorToast: jest.fn(), error: jest.fn() },
}))
jest.mock('../lib/storage/MMKV', () => ({
    createMMKVStorage: () => ({ getItem: () => null, setItem: jest.fn(), removeItem: jest.fn() }),
}))
jest.mock('../lib/utils/File', () => ({
    AppDirectory: { Assets: '/assets/' },
    copyFile: jest.fn(),
    deleteFile: jest.fn(),
}))

beforeEach(() => {
    jest.clearAllMocks()
    useBackgroundStore.setState({ image: 'previous.png' })
    jest.mocked(getDocumentAsync).mockResolvedValue({
        canceled: false,
        assets: [
            { name: 'photo.png', uri: '/picker/photo.png', mimeType: 'image/png', lastModified: 0 },
        ],
    })
})

test('the previous background stays available until its replacement has been copied', async () => {
    let finish!: (copied: boolean) => void
    jest.mocked(copyFile).mockReturnValueOnce(
        new Promise<boolean>((resolve) => {
            finish = resolve
        })
    )
    const pending = useBackgroundStore.getState().importImage()
    await Promise.resolve()
    expect(useBackgroundStore.getState().image).toBe('previous.png')
    expect(deleteFile).not.toHaveBeenCalled()
    finish(true)
    await pending
    const image = useBackgroundStore.getState().image
    expect(image).not.toBe('previous.png')
    expect(copyFile).toHaveBeenCalledWith({ from: '/picker/photo.png', to: `/assets/${image}` })
    expect(deleteFile).toHaveBeenCalledWith('/assets/previous.png')
    expect(deleteFile).not.toHaveBeenCalledWith(`/assets/${image}`)
})

test('copy failure retains the previous background and only cleans the attempted destination', async () => {
    jest.mocked(copyFile).mockResolvedValueOnce(false)
    await useBackgroundStore.getState().importImage()
    expect(useBackgroundStore.getState().image).toBe('previous.png')
    const destination = jest.mocked(copyFile).mock.calls[0][0].to
    expect(deleteFile).toHaveBeenCalledWith(destination)
    expect(deleteFile).not.toHaveBeenCalledWith('/assets/previous.png')
})
