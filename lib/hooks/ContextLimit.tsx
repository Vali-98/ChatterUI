import { SamplerID } from '@lib/constants/SamplerData'
import { APIConfiguration, APIValues } from '@lib/engine/API/APIBuilder.types'
import { useActiveConnectionTemplate } from '@lib/engine/API/connectionStore'
import { Llama } from '@lib/engine/Local/LlamaLocal'
import { useAppMode } from '@lib/state/AppMode'
import { useCurrentSampler } from '@lib/state/samplerStore'

export const useContextLimit = (): number => {
    const { appMode } = useAppMode()
    const localLimit = Llama.useLlamaPreferencesStore((state) => state.config.context_length)
    const sampler = useCurrentSampler()
    const samplerLimit = sampler?.data?.[SamplerID.CONTEXT_LENGTH] ?? 4096
    const { apiValue, apiConfig } = useActiveConnectionTemplate()

    if (appMode === 'local') return localLimit
    if (apiConfig?.model.useModelContextLength && apiConfig && apiValue) {
        const hasContextLimitField = apiConfig.request.samplerFields.some(
            (item) => item.samplerID === SamplerID.GENERATED_LENGTH
        )

        const modelLength = getModelContextLength(apiConfig, apiValue)

        if (modelLength) {
            if (hasContextLimitField) return Math.min(samplerLimit, modelLength)
            return modelLength
        }
    }
    return samplerLimit
}

const getModelContextLength = (config: APIConfiguration, values: APIValues): number | undefined => {
    const keys = config.model.contextSizeParser.split('.')
    const result = keys.reduce((acc, key) => acc?.[key], values.model)
    return Number.isInteger(result) ? result : undefined
}
