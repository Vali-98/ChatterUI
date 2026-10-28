import { APIConfiguration, APIValues } from '@lib/engine/API/APIBuilder.types'

export const requiresConnectionKey = (template: APIConfiguration) =>
    template.features.useKey && template.features.keyRequired === true

export const isConnectionReady = (
    value: APIValues | undefined,
    template: APIConfiguration | undefined
) => {
    if (!value || !template || !value.endpoint.trim()) return false
    if (requiresConnectionKey(template) && !value.key.trim()) return false
    return true
}
