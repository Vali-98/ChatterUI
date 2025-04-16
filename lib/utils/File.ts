import { getDocumentAsync } from 'expo-document-picker'
import {
    cacheDirectory,
    documentDirectory,
    readAsStringAsync,
    writeAsStringAsync,
} from 'expo-file-system'

import { Logger } from '../state/Logger'
import { localDownload } from '@vali98/react-native-fs'

export const AppDirectory = {
    ModelPath: `${documentDirectory}models/`,
    SessionPath: `${documentDirectory}session/`,
    CharacterPath: `${documentDirectory}characters/`,
    Assets: `${documentDirectory}appAssets/`,
}

/**
 *
 * @param data string data of file
 * @param filename filename to be written, include extension
 * @param encoding encoding of file
 */
export const saveStringToDownload = async (
    data: string,
    filename: string,
    encoding: 'base64' | `utf8`
) => {
    await writeAsStringAsync(cacheDirectory + filename, data, { encoding })
    await localDownload(cacheDirectory?.replace('file://', '') + filename).catch((e) =>
        Logger.error('Failed to download: ' + e)
    )
}

type PickerResult = { success: false } | { success: true; data: string }

type JSONPickerResult = { success: false } | { success: true; data: any }

export const pickJSONDocument = async (multiple: boolean = false): Promise<JSONPickerResult> => {
    const result = await pickStringDocument({ type: 'application/json', multiple: multiple })
    if (!result.success) return result
    try {
        const jsonData = JSON.parse(result.data)
        return { success: true, data: jsonData }
    } catch {
        return { success: false }
    }
}

export const pickStringDocument = async ({
    multiple = false,
    encoding = 'utf8',
    type = '*/*',
}: {
    multiple?: boolean
    encoding?: 'utf8' | 'base64'
    type?: string
} = {}): Promise<PickerResult> => {
    const result = await getDocumentAsync({ type: type })
    if (result.canceled) {
        return { success: false }
    }
    const uri = result.assets[0].uri
    const data = await readAsStringAsync(uri, { encoding: encoding }).catch((e) => {
        Logger.info(`Failed to read file: ${e}`)
    })
    if (!data) {
        return { success: false }
    }
    return { success: true, data: data }
}

const gb = 1000 ** 3
const mb = 1000 ** 2

/**
 * Gets a human friendly version of file size
 * @param size size in bytes
 * @returns string containing readable file size
 */
export const readableFileSize = (size: number) => {
    if (size < gb) {
        const sizeInMB = size / mb
        return `${sizeInMB.toFixed(2)} MB`
    } else {
        const sizeInGB = size / gb
        return `${sizeInGB.toFixed(2)} GB`
    }
}

