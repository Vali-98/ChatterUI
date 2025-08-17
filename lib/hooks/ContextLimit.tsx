import { SamplerID } from '@lib/constants/SamplerData'
import { APIConfiguration, APIValues } from '@lib/engine/API/APIBuilder.types'
import { APIManager } from '@lib/engine/API/APIManagerState'
import { Llama } from '@lib/engine/Local/LlamaLocal'
import { useAppMode } from '@lib/state/AppMode'
import { SamplersManager } from '@lib/state/SamplerState'

export const useContextLimit = (): number => {
    const { appMode } = useAppMode()
    const localLimit = Llama.useLlamaPreferencesStore((state) => state.config.context_length)
    const sampler = SamplersManager.useCurrentSampler()
    const samplerLimit = sampler?.data?.[SamplerID.CONTEXT_LENGTH] ?? 4096
    const { apiValue, apiConfig } = APIManager.useActiveValueTemplate()

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
