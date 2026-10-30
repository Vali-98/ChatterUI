import { extractPngTextChunk, replacePngTextChunk } from '@vali98/react-native-png-utils'
import { Asset } from 'expo-asset'
import * as DocumentPicker from 'expo-document-picker'
import { t } from 'i18next'

import { Logger } from '@lib/state/Logger'
import { fileExists, readBase64Async, readStringAsync, saveStringToDownload } from '@lib/utils/File'

import { db } from './db'
import { copyImageFile, createImageId, deleteImageFile, getCardImageUri } from './images'
import { useCharacterImportState } from './importState'
import type { CharacterCardV2 } from './schema'
import {
    characterCardV1Schema,
    characterCardV2Schema,
    buildBlankCharacterCard,
    toCharacterCardV2,
} from './schema'
import type { CreateCardOptions } from './types'

const CHARACTER_CARD_TEXT_CHUNK_KEYWORDS = [
    'Description', // AI bot base description
    'Comment', // incorrect migration, needs to be retained
    'character_card',
    'chara',
    'ccv3',
]

const cleanupImageFile = async (imageId: number | null | undefined) => {
    if (imageId === null || imageId === undefined) return
    try {
        await deleteImageFile(imageId)
    } catch (error) {
        Logger.warn(error)
    }
}

const replaceCardImage = async (
    characterId: number,
    imageUri: string,
    { target = 'image' }: { target?: 'image' | 'background' } = {}
) => {
    const character = await db.query.card(characterId)
    if (!character) throw new Error('Character does not exist')
    const imageId = createImageId(character.image_id, character.background_image ?? -1)
    const oldImageId = target === 'background' ? character.background_image : character.image_id
    try {
        await copyImageFile(imageId, imageUri)
        if (target === 'background') await db.update.backgroundImageReference(characterId, imageId)
        else await db.update.cardFields(characterId, { image_id: imageId })
    } catch (error) {
        await cleanupImageFile(imageId)
        throw error
    }
    await cleanupImageFile(oldImageId)
}

export const updateCardImage = (characterId: number, imageUri: string) =>
    replaceCardImage(characterId, imageUri)

export const deleteCardImage = async (characterId: number) => {
    const character = await db.query.card(characterId)
    if (!character) return
    await db.delete.imageReference(characterId)
    await cleanupImageFile(character.image_id)
}

export const importCardBackground = async (characterId: number) => {
    try {
        const result = await DocumentPicker.getDocumentAsync({
            copyToCacheDirectory: true,
            type: ['image/*'],
        })
        if (result.canceled) return
        await replaceCardImage(characterId, result.assets[0].uri, { target: 'background' })
    } catch (error) {
        Logger.error(error)
    }
}

export const deleteCardBackground = async (characterId: number) => {
    const character = await db.query.card(characterId)
    if (!character) return
    await db.delete.backgroundImageReference(characterId)
    await cleanupImageFile(character.background_image)
    Logger.info(`Deleted background for character: ${characterId}`)
}

export const createCard = async (
    card: CharacterCardV2,
    { imageUri = '', type = 'character' }: CreateCardOptions = {}
) => {
    const created = await db.create.card(card, { type: type, image_id: createImageId() })
    if (!created) return
    if (imageUri) {
        try {
            await copyImageFile(created.image_id, imageUri)
        } catch (error) {
            await db.delete.card(created.id)
            await cleanupImageFile(created.image_id)
            throw error
        }
    }
    return created.id
}

export const deleteCard = async (characterId: number) => {
    const character = await db.query.card(characterId)
    if (!character) return
    await db.delete.card(characterId)
    await cleanupImageFile(character.image_id)
    await cleanupImageFile(character.background_image)
}

export const duplicateCard = async (characterId: number) => {
    const character = await db.query.card(characterId)
    if (!character) return
    const createdId = await createCard(toCharacterCardV2(character), { type: character.type })
    if (createdId === undefined) return
    try {
        if (fileExists(getCardImageUri(character.image_id)))
            await updateCardImage(createdId, getCardImageUri(character.image_id))
        if (
            character.background_image !== null &&
            fileExists(getCardImageUri(character.background_image))
        ) {
            await replaceCardImage(createdId, getCardImageUri(character.background_image), {
                target: 'background',
            })
        }
    } catch (error) {
        await deleteCard(createdId)
        throw error
    }
    Logger.info(`Card cloned: ${character.name}`)
    return createdId
}

export type CardImportResult = { success: true; data: number } | { success: false; error: Error }

const importFailure = (error: unknown): CardImportResult => ({
    success: false,
    error: error instanceof Error ? error : new Error(String(error)),
})

const importCardData = async (data: unknown, imageUri?: string): Promise<CardImportResult> => {
    try {
        const v2 = characterCardV2Schema.safeParse(data)
        let card: CharacterCardV2
        if (v2.success) card = v2.data
        else {
            const v1 = characterCardV1Schema.safeParse(data)
            if (!v1.success) return importFailure(t('character.editor.errors.invalidCharacterCard'))
            card = buildBlankCharacterCard(v1.data.name, v1.data)
        }
        const id = await createCard(card, { imageUri })
        if (id === undefined) return importFailure(t('character.editor.errors.createFailed'))
        return { success: true, data: id }
    } catch (error) {
        return importFailure(error)
    }
}

export const importCardImage = async (imageUri: string): Promise<CardImportResult> => {
    try {
        const file = await readBase64Async(imageUri)
        if (!file) return importFailure(t('character.editor.errors.createFromImage'))
        const [result] = extractPngTextChunk(file, {
            keywords: CHARACTER_CARD_TEXT_CHUNK_KEYWORDS,
        })
        if (!result) return importFailure(t('character.editor.errors.createFromImage'))
        return await importCardData(JSON.parse(result.data), imageUri)
    } catch (error) {
        return importFailure(error)
    }
}

export const importCards = async () => {
    if (useCharacterImportState.getState().isImporting) return
    useCharacterImportState.setState({
        isImporting: true,
        total: 0,
        completed: 0,
        succeeded: 0,
        failed: 0,
        noticeDismissed: false,
    })
    try {
        const result = await DocumentPicker.getDocumentAsync({
            copyToCacheDirectory: true,
            type: ['image/*', 'application/json'],
            multiple: true,
        })
        if (result.canceled) return
        useCharacterImportState.setState({ total: result.assets.length })
        await Promise.all(
            result.assets.map(async (item) => {
                let succeeded = false
                try {
                    let imported: CardImportResult
                    if (item.mimeType?.includes('application/json')) {
                        const data = await readStringAsync(item.uri)
                        imported = await importCardData(JSON.parse(data))
                    } else if (item.mimeType?.includes('image/')) {
                        imported = await importCardImage(item.uri)
                    } else throw new Error(t('character.editor.errors.invalidCharacterCard'))
                    succeeded = imported.success
                    if (!imported.success)
                        Logger.error(`Failed to create card from '${item.name}': ${imported.error}`)
                } catch (error) {
                    Logger.error(`Failed to create card from '${item.name}': ${error}`)
                } finally {
                    useCharacterImportState.setState((state) => ({
                        completed: state.completed + 1,
                        succeeded: state.succeeded + (succeeded ? 1 : 0),
                        failed: state.failed + (succeeded ? 0 : 1),
                    }))
                }
            })
        )
    } finally {
        useCharacterImportState.setState({ isImporting: false })
    }
}

export const exportCard = async (characterId: number) => {
    const character = await db.query.card(characterId)
    if (!character) {
        Logger.error('Exported card does not exist!')
        return
    }
    // name can be empty string, should at least have something
    const exportedFileName = character.name ?? 'Character'
    const cardJson = JSON.stringify(toCharacterCardV2(character))

    const imageUri = getCardImageUri(character.image_id)
    if (fileExists(imageUri)) {
        const fileData = await readBase64Async(imageUri)
        if (!fileData) return
        const exportData = replacePngTextChunk(
            fileData,
            [{ data: cardJson, keyword: 'chara', b64encode: true }],
            { removeKeywords: CHARACTER_CARD_TEXT_CHUNK_KEYWORDS }
        )
        await saveStringToDownload(exportData, exportedFileName + '.png', 'base64')
    } else {
        await saveStringToDownload(cardJson, exportedFileName + '.json', 'utf8')
    }
}

export const createDefaultCard = async (): Promise<CardImportResult> => {
    try {
        const [asset] = await Asset.loadAsync(require('../../../assets/models/aibot.raw'))
        if (!asset.localUri) throw new Error('Default character asset has no local URI')
        return await importCardImage(asset.localUri)
    } catch (error) {
        return importFailure(error)
    }
}
