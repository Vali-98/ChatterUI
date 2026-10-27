import { getDocumentAsync } from 'expo-document-picker'

export const pickAudioAttachments = async () => {
    const result = await getDocumentAsync({
        type: 'audio/*',
        multiple: true,
        copyToCacheDirectory: true,
    })
    return result.canceled
        ? []
        : result.assets.map((asset) => ({
              uri: asset.uri,
              name: asset.name,
              type: 'audio' as const,
          }))
}
