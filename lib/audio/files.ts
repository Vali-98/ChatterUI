import { convertToWav } from '@vali98/react-native-png-utils'
import { randomUUID } from 'expo-crypto'
import { getDocumentAsync } from 'expo-document-picker'
import { Directory, Paths } from 'expo-file-system'

import { deleteFile } from '@lib/utils/File'

export type AudioAttachmentFile = { uri: string; name: string; type: 'audio' }

export const convertAudioAttachment = async (
    uri: string,
    name: string
): Promise<AudioAttachmentFile> => {
    const wavName = (name.split(/[\\/]/).pop() ?? 'audio').replace(/\.[^.]+$/, '') + '.wav'
    const directory = new Directory(Paths.cache, `audio-${randomUUID()}`)
    directory.create()
    const outputUri = `${directory.uri.replace(/\/$/, '')}/${encodeURIComponent(wavName)}`
    try {
        const result = await convertToWav(uri, outputUri)
        return { uri: result.uri, name: wavName, type: 'audio' }
    } catch (error) {
        // The converter removes incomplete output; this directory belongs only to this attempt.
        directory.delete()
        throw error
    }
}

export const pickAudioAttachments = async (): Promise<AudioAttachmentFile[]> => {
    const result = await getDocumentAsync({
        type: 'audio/*',
        multiple: true,
        copyToCacheDirectory: true,
    })
    if (result.canceled) return []
    const converted: AudioAttachmentFile[] = []
    try {
        for (const asset of result.assets)
            converted.push(await convertAudioAttachment(asset.uri, asset.name))
        return converted
    } catch (error) {
        for (const attachment of converted) deleteFile(attachment.uri)
        throw error
    }
}
