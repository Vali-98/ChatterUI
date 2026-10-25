import { Paths } from 'expo-file-system'

import { copyFile, deleteFile, fileExists } from '@lib/utils/File'

export const getCardImageUri = (imageId: number) => `${Paths.document.uri}characters/${imageId}.png`

export const createImageId = (...reservedImageIds: number[]) => {
    let id = Date.now()
    while (reservedImageIds.includes(id) || fileExists(getCardImageUri(id))) id++
    return id
}

export const deleteImageFile = async (imageId: number) => {
    if (imageId < 0) return
    if (!(await deleteFile(getCardImageUri(imageId))))
        throw new Error('Failed to delete character image')
}

export const copyImageFile = async (imageId: number, imageUri: string) => {
    if (!(await copyFile({ from: imageUri, to: getCardImageUri(imageId) }))) {
        throw new Error('Failed to copy character image')
    }
}
