import { randomUUID } from 'expo-crypto'
import mime from 'mime/lite'

import { Logger } from '@lib/state/Logger'
import { AppDirectory, copyFile, deleteFile, fileInfo } from '@lib/utils/File'

import type { AttachmentInput } from './types'

export const deleteAttachmentFiles = (attachments: Pick<AttachmentInput, 'uri'>[]) => {
    for (const { uri } of attachments) {
        if (!deleteFile(uri)) Logger.warn(`Failed to delete chat attachment: ${uri}`)
    }
}

export const copyAttachment = async (source: AttachmentInput): Promise<AttachmentInput> => {
    const extension = source.name.split('.').pop()?.toLowerCase()
    const uri = `${AppDirectory.Attachments}${randomUUID()}${extension ? `.${extension}` : ''}`
    if (!(await copyFile({ from: source.uri, to: uri }))) {
        deleteAttachmentFiles([{ uri }])
        throw new Error(`Failed to copy chat attachment: ${source.name}`)
    }
    return { ...source, uri }
}

export const prepareAttachment = async (uri: string): Promise<AttachmentInput> => {
    const info = fileInfo(uri)
    const name = uri.split('/').pop() ?? ''
    const mimeType = mime.getType(name)
    const type = mimeType?.split('/')[0]
    if (!info.exists || !mimeType || (type !== 'audio' && type !== 'image')) {
        throw new Error(`Unsupported or missing chat attachment: ${name}`)
    }
    return copyAttachment({
        name: name,
        uri: uri,
        type: type,
        mime_type: mimeType,
        size: info.size ?? 0,
    })
}
