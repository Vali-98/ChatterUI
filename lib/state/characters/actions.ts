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
import { copyImage, createImageId, deleteImage as deleteImageFile, getImageDir } from './images'
import type { CharacterCardV2 } from './schema'
import {
    characterCardV1Schema,
    characterCardV2Schema,
    createBlankV2Card,
    convertDBDataToCV2,
} from './schema'

const CHARACTER_CARD_TEXT_CHUNK_KEYWORDS = [
    'Description', // AI bot base description
    'Comment', // incorrect migration, needs to be retained
    'character_card',
    'chara',
    'ccv3',
]

const cleanupImage = async (id: number | null | undefined) => {
    if (id === null || id === undefined) return
    try {
        await deleteImageFile(id)
    } catch (error) {
        Logger.warn(error)
    }
}

const replaceImage = async (id: number, uri: string, background: boolean) => {
    const card = await db.query.card(id)
    if (!card) throw new Error('Character does not exist')
    const imageId = createImageId(card.image_id, card.background_image ?? -1)
    const oldImageId = background ? card.background_image : card.image_id
    try {
        await copyImage(uri, imageId)
        if (background) await db.mutate.updateBackground(id, imageId)
        else await db.mutate.updateCardField('image_id', imageId, id)
    } catch (error) {
        await cleanupImage(imageId)
        throw error
    }
    await cleanupImage(oldImageId)
}

export const updateImage = (id: number, uri: string) => replaceImage(id, uri, false)

export const deleteImage = async (id: number) => {
    const card = await db.query.card(id)
    if (!card) return
    await db.mutate.deleteImage(id)
    await cleanupImage(card.image_id)
}

export const importBackground = async (id: number) => {
    try {
        const result = await DocumentPicker.getDocumentAsync({
            copyToCacheDirectory: true,
            type: ['image/*'],
        })
        if (result.canceled) return
        await replaceImage(id, result.assets[0].uri, true)
    } catch (error) {
        Logger.error(error)
    }
}

export const deleteBackground = async (id: number) => {
    const card = await db.query.card(id)
    if (!card) return
    await db.mutate.deleteBackground(id)
    await cleanupImage(card.background_image)
    Logger.info(`Deleted background for character: ${id}`)
}

export const createCharacter = async (
    card: CharacterCardV2,
    uri = '',
    type: 'character' | 'user' = 'character'
) => {
    const created = await db.mutate.createCharacter(card, type, createImageId())
    if (!created) return
    if (uri) {
        try {
            await copyImage(uri, created.image_id)
        } catch (error) {
            await db.mutate.deleteCard(created.id)
            await cleanupImage(created.image_id)
            throw error
        }
    }
    return created.id
}

export const deleteCard = async (id: number) => {
    const card = await db.query.card(id)
    if (!card) return
    await db.mutate.deleteCard(id)
    await cleanupImage(card.image_id)
    await cleanupImage(card.background_image)
}

export const duplicateCard = async (id: number) => {
    const card = await db.query.card(id)
    if (!card) return
    const createdId = await createCharacter(convertDBDataToCV2(card), '', card.type)
    if (createdId === undefined) return
    try {
        if (fileExists(getImageDir(card.image_id)))
            await updateImage(createdId, getImageDir(card.image_id))
        if (card.background_image !== null && fileExists(getImageDir(card.background_image))) {
            await replaceImage(createdId, getImageDir(card.background_image), true)
        }
    } catch (error) {
        await deleteCard(createdId)
        throw error
    }
    Logger.info(`Card cloned: ${card.name}`)
    return createdId
}

export const createCharacterFromImage = async (uri: string) => {
    try {
        const file = await readBase64Async(uri)
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

        await createCharacterFromV2JSON(card, uri)
    } catch (e) {
        Logger.errorToast(t('character.editor.errors.createFailed'))
        Logger.error(`${e}`)
    }
}

const createCharacterFromV1JSON = async (data: any, uri: string | undefined = undefined) => {
    const result = characterCardV1Schema.safeParse(data)
    if (result.error) {
        Logger.errorToast(t('character.editor.errors.invalidCharacterCard'))
        return
    }
    const converted = createBlankV2Card(result.data.name, result.data)

    Logger.info(`Creating new character: ${result.data.name}`)
    return createCharacter(converted, uri)
}

const createCharacterFromV2JSON = async (data: any, uri: string | undefined = undefined) => {
    // check JSON def
    const result = characterCardV2Schema.safeParse(data)
    if (result.error) {
        Logger.warnToast(t('character.editor.errors.v2ParsingFailedFallingBack'))
        return await createCharacterFromV1JSON(data, uri)
    }

    Logger.info(`Creating new character: ${result.data.data.name}`)
    return await createCharacter(result.data, uri)
}

export const importCharacter = async () => {
    const result = await DocumentPicker.getDocumentAsync({
        copyToCacheDirectory: true,
        type: ['image/*', 'application/json'],
        multiple: true,
    })
    if (result.canceled) return
    await Promise.all(
        result.assets.map(async (item) => {
            const isPNG = item.mimeType?.includes('image/')
            const isJSON = item.mimeType?.includes('application/json')
            try {
                if (isJSON) {
                    const data = await readStringAsync(item.uri)
                    await createCharacterFromV2JSON(JSON.parse(data))
                }

                if (isPNG) await createCharacterFromImage(item.uri)
            } catch (e) {
                Logger.error(`Failed to create card from '${item.name}': ${e}`)
            }
        })
    )
}

export const exportCharacter = async (id: number) => {
    const dbcard = await db.query.card(id)
    if (!dbcard) {
        Logger.error('Exported card does not exist!')
        return
    }
    // name can be empty string, should at least have something
    const exportedFileName = dbcard.name ?? 'Character'
    const cardString = JSON.stringify(convertDBDataToCV2(dbcard))

    const imagePath = getImageDir(dbcard.image_id)
    if (fileExists(imagePath)) {
        const fileData = await readBase64Async(imagePath)
        if (!fileData) return
        const exportData = replacePngTextChunk(
            fileData,
            [{ data: cardString, keyword: 'chara', b64encode: true }],
            { removeKeywords: CHARACTER_CARD_TEXT_CHUNK_KEYWORDS }
        )
        await saveStringToDownload(exportData, exportedFileName + '.png', 'base64')
    } else {
        await saveStringToDownload(cardString, exportedFileName + '.json', 'utf8')
    }
}

export const createDefaultCard = async () => {
    const filename = 'aibot'
    const pngName = filename + '.png'
    const cardDefaultDir = `${Paths.document.uri}appAssets/${pngName}`

    try {
        if (!fileExists(cardDefaultDir)) {
            Logger.info('Importing default card.')
            const [asset] = await Asset.loadAsync(require('../../../assets/models/aibot.raw'))
            if (asset.localUri && !(await copyFile({ from: asset.localUri, to: cardDefaultDir }))) {
                throw new Error('Failed to copy default character')
            }
        }
        await createCharacterFromImage(cardDefaultDir)
    } catch (e) {
        Logger.errorToast(t('settings.character.errors.failedToCreateDefaultCharacter'))
        Logger.error('Error: ' + e)
    }
}
