import { extractPngTextChunk } from '@vali98/react-native-png-utils'
import { Asset } from 'expo-asset'
import { getDocumentAsync } from 'expo-document-picker'
import { readBase64Async, readStringAsync } from '../lib/utils/File'
import {
    createCard,
    createDefaultCard,
    deleteCardImage,
    duplicateCard,
    updateCardImage,
    importCards,
    importCardImage,
} from '../lib/state/characters/actions'
import { db } from '../lib/state/characters/db'
import { copyImageFile, deleteImageFile } from '../lib/state/characters/images'
import { buildBlankCharacterCard } from '../lib/state/characters/schema'
import type { CharacterCard } from '../lib/state/characters/types'
import { useCharacterImportState } from '../lib/state/characters/importState'
import { Logger } from '../lib/state/Logger'

jest.mock('@vali98/react-native-png-utils', () => ({
    extractPngTextChunk: jest.fn(),
    replacePngTextChunk: jest.fn(),
}))
jest.mock('expo-asset', () => ({ Asset: { loadAsync: jest.fn() } }))
jest.mock('../assets/models/aibot.raw', () => 123)
jest.mock('expo-document-picker', () => ({ getDocumentAsync: jest.fn() }))
jest.mock('expo-file-system', () => ({ Paths: { document: { uri: '/document/' } } }))
jest.mock('../lib/state/Logger', () => ({
    Logger: { info: jest.fn(), warn: jest.fn(), error: jest.fn(), errorToast: jest.fn() },
}))
jest.mock('../lib/utils/File', () => ({
    fileExists: jest.fn(() => true),
    readBase64Async: jest.fn(),
    readStringAsync: jest.fn(),
}))
jest.mock('../lib/state/characters/images', () => {
    let nextImageId = 100
    return {
        createImageId: jest.fn(() => nextImageId++),
        getCardImageUri: (imageId: number) => `/cards/${imageId}.png`,
        copyImageFile: jest.fn(async () => {}),
        deleteImageFile: jest.fn(async () => {}),
    }
})
jest.mock('../lib/state/characters/db', () => {
    const cards = new Map()
    const mutate = {
        createCard: jest.fn(async (card, options) => {
            const id = 2
            cards.set(id, {
                ...card.data,
                id: id,
                type: options.type,
                image_id: options.image_id,
                background_image: null,
                tags: [],
                alternate_greetings: [],
                links: [],
            })
            return { id: id, image_id: options.image_id }
        }),
        deleteCard: jest.fn(async (id) => {
            cards.delete(id)
        }),
        updateCardFields: jest.fn(async (id, changes) => {
            cards.set(id, { ...cards.get(id), ...changes })
        }),
        updateCardBackground: jest.fn(async (id, imageId) => {
            cards.set(id, { ...cards.get(id), background_image: imageId })
        }),
        clearCardImage: jest.fn(async (id) => {
            cards.set(id, { ...cards.get(id), image_id: -1 })
        }),
    }
    return {
        cards: cards,
        db: {
            query: { card: jest.fn(async (id) => cards.get(id)) },
            create: { card: mutate.createCard },
            update: {
                cardFields: mutate.updateCardFields,
                backgroundImageReference: mutate.updateCardBackground,
            },
            delete: { card: mutate.deleteCard, imageReference: mutate.clearCardImage },
        },
    }
})
const { cards } = require('../lib/state/characters/db') as { cards: Map<number, CharacterCard> }

beforeEach(() => {
    jest.clearAllMocks()
    cards.clear()
    cards.set(1, {
        ...buildBlankCharacterCard('Persona').data,
        id: 1,
        type: 'user',
        image_id: 20,
        background_image: 30,
        tags: [],
        alternate_greetings: [],
        links: [],
    } as unknown as CharacterCard)
})

test('creation forwards user type, database image_id and source image URI in the correct roles', async () => {
    const card = buildBlankCharacterCard('Imported')
    expect(await createCard(card, { type: 'user', imageUri: '/source.png' })).toBe(2)
    const imageId = cards.get(2)!.image_id
    expect(db.create.card).toHaveBeenCalledWith(card, { type: 'user', image_id: imageId })
    expect(copyImageFile).toHaveBeenCalledWith(imageId, '/source.png')
})

test('duplicating a user card preserves type and creates independent image/background assets', async () => {
    expect(await duplicateCard(1)).toBe(2)
    const original = cards.get(1)!
    const duplicate = cards.get(2)!
    expect(duplicate.type).toBe('user')
    expect(duplicate.image_id).not.toBe(original.image_id)
    expect(duplicate.background_image).not.toBe(original.background_image)
    expect(copyImageFile).toHaveBeenCalledWith(duplicate.image_id, '/cards/20.png')
    expect(copyImageFile).toHaveBeenCalledWith(duplicate.background_image, '/cards/30.png')
    expect(original.image_id).toBe(20)
    expect(original.background_image).toBe(30)
})

test('a failed image copy rolls back the new card instead of leaving a partial import', async () => {
    jest.mocked(copyImageFile).mockRejectedValueOnce(new Error('copy failed'))
    await expect(
        createCard(buildBlankCharacterCard('Failed'), { imageUri: '/bad.png' })
    ).rejects.toThrow('copy failed')
    expect(cards.has(2)).toBe(false)
    expect(db.delete.card).toHaveBeenCalledWith(2)
    expect(deleteImageFile).toHaveBeenCalled()
})

test('a failed image-reference update cleans the new file while preserving the original asset', async () => {
    jest.mocked(db.update.cardFields).mockRejectedValueOnce(new Error('write failed'))
    await expect(updateCardImage(1, '/replacement.png')).rejects.toThrow('write failed')
    expect(cards.get(1)!.image_id).toBe(20)
    expect(deleteImageFile).not.toHaveBeenCalledWith(20)
    expect(deleteImageFile).toHaveBeenCalledTimes(1)
})

test('deleting a card image clears the database reference and deletes its physical file', async () => {
    await deleteCardImage(1)
    expect(db.delete.imageReference).toHaveBeenCalledWith(1)
    expect(cards.get(1)!.image_id).toBe(-1)
    expect(deleteImageFile).toHaveBeenCalledWith(20)
    expect(cards.get(1)!.background_image).toBe(30)
})

test('the default card imports the bundled asset directly and returns its new ID in a result', async () => {
    jest.mocked(Asset.loadAsync).mockResolvedValueOnce([
        { localUri: 'file:///bundle/aibot.raw' },
    ] as never)
    jest.mocked(readBase64Async).mockResolvedValueOnce('png-data')
    jest.mocked(extractPngTextChunk).mockReturnValueOnce([
        { keyword: 'Description', data: JSON.stringify(buildBlankCharacterCard('AI Bot')) },
    ])
    expect(await createDefaultCard()).toEqual({ success: true, data: 2 })
    expect(readBase64Async).toHaveBeenCalledWith('file:///bundle/aibot.raw')
    expect(copyImageFile).toHaveBeenCalledWith(expect.any(Number), 'file:///bundle/aibot.raw')
    expect(cards.get(2)?.name).toBe('AI Bot')
})

test('a missing local asset URI returns a failure', async () => {
    jest.mocked(Asset.loadAsync).mockResolvedValueOnce([{ localUri: null }] as never)
    expect(await createDefaultCard()).toEqual({ success: false, error: expect.any(Error) })
    expect(db.create.card).not.toHaveBeenCalled()
})

test('a failed card import reports no created ID so startup can retry', async () => {
    jest.mocked(Asset.loadAsync).mockResolvedValueOnce([
        { localUri: 'file:///bundle/aibot.raw' },
    ] as never)
    jest.mocked(readBase64Async).mockResolvedValueOnce('png-data')
    jest.mocked(extractPngTextChunk).mockReturnValueOnce([])
    expect(await createDefaultCard()).toEqual({ success: false, error: expect.any(Error) })
    expect(db.create.card).not.toHaveBeenCalled()
})

test('bulk imports count successful and failed files and release their blocker', async () => {
    jest.mocked(getDocumentAsync).mockResolvedValueOnce({
        canceled: false,
        assets: [
            { name: 'good.json', uri: '/good.json', mimeType: 'application/json' },
            { name: 'bad.json', uri: '/bad.json', mimeType: 'application/json' },
        ],
    } as never)
    jest.mocked(readStringAsync).mockImplementation(async (uri) =>
        uri === '/good.json' ? JSON.stringify(buildBlankCharacterCard('Imported')) : 'invalid JSON'
    )
    await importCards()
    expect(useCharacterImportState.getState()).toMatchObject({
        isImporting: false,
        total: 2,
        completed: 2,
        succeeded: 1,
        failed: 1,
    })
})

test('a pending bulk import prevents a second picker and cancellation releases it', async () => {
    let cancel!: (result: Awaited<ReturnType<typeof getDocumentAsync>>) => void
    jest.mocked(getDocumentAsync).mockImplementationOnce(
        () =>
            new Promise((resolve) => {
                cancel = resolve
            })
    )
    const first = importCards()
    expect(useCharacterImportState.getState().isImporting).toBe(true)
    await importCards()
    expect(getDocumentAsync).toHaveBeenCalledTimes(1)
    cancel({ canceled: true, assets: null })
    await first
    expect(useCharacterImportState.getState()).toMatchObject({
        isImporting: false,
        total: 0,
        completed: 0,
        succeeded: 0,
        failed: 0,
    })
})

test('a rejected picker releases the import blocker', async () => {
    jest.mocked(getDocumentAsync).mockRejectedValueOnce(new Error('picker failed'))
    await expect(importCards()).rejects.toThrow('picker failed')
    expect(useCharacterImportState.getState().isImporting).toBe(false)
})

test('image imports that report no created card count as failures', async () => {
    jest.mocked(getDocumentAsync).mockResolvedValueOnce({
        canceled: false,
        assets: [{ name: 'missing.png', uri: '/missing.png', mimeType: 'image/png' }],
    } as never)
    jest.mocked(readBase64Async).mockResolvedValueOnce('png-without-card')
    jest.mocked(extractPngTextChunk).mockReturnValueOnce([])
    await importCards()
    expect(useCharacterImportState.getState()).toMatchObject({
        isImporting: false,
        total: 1,
        completed: 1,
        succeeded: 0,
        failed: 1,
    })
    expect(Logger.errorToast).not.toHaveBeenCalled()
})

test.each([
    ['v1', { name: 'Imported', description: 'Legacy card' }],
    ['v2', buildBlankCharacterCard('Imported')],
])(
    'a %s image import returns the created ID without presenting feedback',
    async (_version, card) => {
        jest.mocked(readBase64Async).mockResolvedValueOnce('png-data')
        jest.mocked(extractPngTextChunk).mockReturnValueOnce([
            { keyword: 'chara', data: JSON.stringify(card) },
        ])
        expect(await importCardImage('/card.png')).toEqual({ success: true, data: 2 })
        expect(cards.get(2)?.name).toBe('Imported')
        expect(Logger.errorToast).not.toHaveBeenCalled()
    }
)

test('an image-copy failure returns its error after rolling back the imported card', async () => {
    const error = new Error('copy failed')
    jest.mocked(readBase64Async).mockResolvedValueOnce('png-data')
    jest.mocked(extractPngTextChunk).mockReturnValueOnce([
        { keyword: 'chara', data: JSON.stringify(buildBlankCharacterCard('Imported')) },
    ])
    jest.mocked(copyImageFile).mockRejectedValueOnce(error)
    expect(await importCardImage('/card.png')).toEqual({ success: false, error })
    expect(cards.has(2)).toBe(false)
    expect(deleteImageFile).toHaveBeenCalled()
    expect(Logger.errorToast).not.toHaveBeenCalled()
})
