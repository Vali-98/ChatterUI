import { z } from 'zod'

export const manifestSchema = z.object({
    format: z.literal('chatterui-backup'),
    version: z.literal(1),
    appVersion: z.string(),
    createdAt: z.string(),
    documentUri: z.string().min(1),
    schemaTimestamp: z.number().finite(),
    includesApiKeys: z.boolean(),
})

export const remapAttachmentUri = (uri: string, sourceRoot: string, destinationRoot: string) => {
    const prefix = `${sourceRoot.replace(/\/$/, '')}/attachments/`
    if (!uri.startsWith(prefix)) throw new Error('Attachment is outside the backup media directory')
    const relative = uri.slice(prefix.length)
    const decoded = decodeURIComponent(relative)
    if (
        !decoded ||
        decoded.includes('\\') ||
        decoded.split('/').some((part) => !part || part === '.' || part === '..')
    )
        throw new Error('Invalid attachment path')
    return `${destinationRoot.replace(/\/$/, '')}/attachments/${relative}`
}
