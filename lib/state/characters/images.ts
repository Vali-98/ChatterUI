import { Paths } from 'expo-file-system'

import { copyFile, deleteFile, fileExists } from '@lib/utils/File'

export const getImageDir = (imageId: number) => `${Paths.document.uri}characters/${imageId}.png`

export const createImageId = (...reserved: number[]) => {
    let id = Date.now()
    while (reserved.includes(id) || fileExists(getImageDir(id))) id++
    return id
}

export const deleteImage = async (imageId: number) => {
    if (imageId < 0) return
    if (!(await deleteFile(getImageDir(imageId))))
        throw new Error('Failed to delete character image')
}

export const copyImage = async (uri: string, imageId: number) => {
    if (!(await copyFile({ from: uri, to: getImageDir(imageId) }))) {
        throw new Error('Failed to copy character image')
    }
}
