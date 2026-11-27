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

export const getModelEndpoint = (value: APIValues, endpoint: string) => {
    if (value.configName !== 'Chat Completions') return value.modelEndpoint
    const previous = value.endpoint.replace(/\/chat\/completions\/?$/, '/models')
    if (value.modelEndpoint && value.modelEndpoint !== previous) return value.modelEndpoint
    return /\/chat\/completions\/?$/.test(endpoint)
        ? endpoint.replace(/\/chat\/completions\/?$/, '/models')
        : ''
}
