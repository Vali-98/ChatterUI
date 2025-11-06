import { localDownload } from '@vali98/react-native-fs'
import { getDocumentAsync } from 'expo-document-picker'
import { File, Paths } from 'expo-file-system'

import { Logger } from '../state/Logger'

export const AppDirectory = {
    ModelPath: `${Paths.document}models/`,
    SessionPath: `${Paths.document}session/`,
    CharacterPath: `${Paths.document}characters/`,
    Assets: `${Paths.document}appAssets/`,
    Attachments: `${Paths.document}attachments/`,
}

export namespace FileUtils {
    export const getDocumentDir = (dir: string) => {
        return `${Paths.document}${dir}`
    }

    export const getCacheDir = (dir: string) => {
        return `${Paths.cache}${dir}`
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
        new File(Paths.cache, filename).write(data, { encoding })
        await localDownload((Paths.cache + filename).replace('file://', '')).catch((e) =>
            Logger.error('Failed to download: ' + e)
        )
    }

    export const pickText = async (params: { type?: string } = {}): Promise<PickerResult> => {
        return pickFile(async (file) => {
            return await file.text()
        }, params)
    }

    export const pickBase64 = async (params: { type?: string } = {}): Promise<PickerResult> => {
        return pickFile(async (file) => {
            return await file.base64()
        }, params)
    }

    export const pickJSON = async (params: { type?: string } = {}): Promise<PickerResult> => {
        const result = await pickText(params)
        if (!result.success) return result
        try {
            return { success: true, data: JSON.parse(result.data) }
        } catch {
            return { success: false }
        }
    }

    const pickFile = async (
        fileReader: (file: File) => Promise<string>,
        { type = '*/*' }: { type?: string } = {}
    ): Promise<PickerResult> => {
        const result = await getDocumentAsync({ type: type })
        if (result.canceled) {
            return { success: false }
        }
        const [asset] = result.assets
        const file = new File(asset.uri)
        let data = await fileReader(file)
        if (!data) {
            return { success: false }
        }
        return { success: true, data: data }
    }
}

export const saveStringToDownload = async (
    data: string,
    filename: string,
    encoding: 'base64' | `utf8`
) => {
    new File(Paths.cache, filename).write(data, { encoding })
    await localDownload((Paths.cache + filename).replace('file://', '')).catch((e) =>
        Logger.error('Failed to download: ' + e)
    )
}

type PickerResult = { success: false } | { success: true; data: string }

type JSONPickerResult = { success: false } | { success: true; data: any }

/**@deprecated */
export const pickJSONDocument = async (): Promise<JSONPickerResult> => {
    const result = await pickStringDocument({ type: 'application/json' })
    if (!result.success) return result
    try {
        const jsonData = JSON.parse(result.data)
        return { success: true, data: jsonData }
    } catch {
        return { success: false }
    }
}

/**@deprecated */
export const pickStringDocument = async ({
    encoding = 'utf8',
    type = '*/*',
}: {
    encoding?: 'utf8' | 'base64'
    type?: string
} = {}): Promise<PickerResult> => {
    const result = await getDocumentAsync({ type: type })
    if (result.canceled) {
        return { success: false }
    }
    const uri = result.assets[0].uri
    const file = new File(uri)
    let data = ''
    if (encoding === 'utf8') data = await file.text()
    else data = file.base64()

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
