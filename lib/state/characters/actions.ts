import { extractPngTextChunk, replacePngTextChunk } from '@vali98/react-native-png-utils'
import { Asset } from 'expo-asset'
import * as DocumentPicker from 'expo-document-picker'
import { Paths } from 'expo-file-system'
import { t } from 'i18next'

import { Logger } from '@lib/state/Logger'
import {
    copyFile,
    fileExists,
    readBase64Async,
    readStringAsync,
    saveStringToDownload,
} from '@lib/utils/File'

import { db } from './db'
import { copyImageFile, createImageId, deleteImageFile, getCardImageUri } from './images'
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

export const importCardImage = async (imageUri: string) => {
    try {
        const file = await readBase64Async(imageUri)
        if (!file) {
            Logger.errorToast(t('character.editor.errors.createFromImage'))
            return
        }
        const [result] = extractPngTextChunk(file, {
            keywords: CHARACTER_CARD_TEXT_CHUNK_KEYWORDS,
        })

        if (!result) {
            Logger.errorToast(t('character.editor.errors.createFromImage'))
            return
        }

        const card = JSON.parse(result.data)
        if (card === undefined) {
            Logger.errorToast(t('character.editor.errors.cardNoCharacter'))
            return
        }

        await importCardV2(card, imageUri)
    } catch (e) {
        Logger.errorToast(t('character.editor.errors.createFailed'))
        Logger.error(`${e}`)
    }
}

const importCardV1 = async (data: unknown, imageUri?: string) => {
    const result = characterCardV1Schema.safeParse(data)
    if (result.error) {
        Logger.errorToast(t('character.editor.errors.invalidCharacterCard'))
        return
    }
    const converted = buildBlankCharacterCard(result.data.name, result.data)

    Logger.info(`Creating new character: ${result.data.name}`)
    return createCard(converted, { imageUri: imageUri })
}

const importCardV2 = async (data: unknown, imageUri?: string) => {
    // check JSON def
    const result = characterCardV2Schema.safeParse(data)
    if (result.error) {
        Logger.warnToast(t('character.editor.errors.v2ParsingFailedFallingBack'))
        return await importCardV1(data, imageUri)
    }

    Logger.info(`Creating new character: ${result.data.data.name}`)
    return await createCard(result.data, { imageUri: imageUri })
}

export const importCards = async () => {
    const result = await DocumentPicker.getDocumentAsync({
        copyToCacheDirectory: true,
        type: ['image/*', 'application/json'],
        multiple: true,
    })
    if (result.canceled) return
    await Promise.all(
        result.assets.map(async (item) => {
            const isImage = item.mimeType?.includes('image/')
            const isJson = item.mimeType?.includes('application/json')
            try {
                if (isJson) {
                    const data = await readStringAsync(item.uri)
                    await importCardV2(JSON.parse(data))
                }

                if (isImage) await importCardImage(item.uri)
            } catch (e) {
                Logger.error(`Failed to create card from '${item.name}': ${e}`)
            }
        })
    )
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

export const createDefaultCard = async () => {
    const imageName = 'aibot'
    const imageFileName = imageName + '.png'
    const defaultImageUri = `${Paths.document.uri}appAssets/${imageFileName}`

    try {
        if (!fileExists(defaultImageUri)) {
            Logger.info('Importing default card.')
            const [asset] = await Asset.loadAsync(require('../../../assets/models/aibot.raw'))
            if (
                asset.localUri &&
                !(await copyFile({ from: asset.localUri, to: defaultImageUri }))
            ) {
                throw new Error('Failed to copy default character')
            }
        }
        await importCardImage(defaultImageUri)
    } catch (e) {
        Logger.errorToast(t('settings.character.errors.failedToCreateDefaultCharacter'))
        Logger.error('Error: ' + e)
    }
}
