import { SamplerConfigData, SamplerID, Samplers } from '@lib/constants/SamplerData'
import { InstructType } from '@lib/state/Instructs'
import { SamplersManager } from '@lib/state/SamplerState'

import { APIConfiguration, APISampler, APIValues } from './APIBuilder.types'
import { Message } from './ContextBuilder'

export interface RequestBuilderParams {
    apiConfig: APIConfiguration
    apiValues: APIValues
    samplers: SamplerConfigData
    instruct: InstructType
    stopSequence: string[]
    prompt: string | Message[]
}

type SamplerField = {
    [x: string]: string | number | boolean | object
}

export const buildRequest = async ({
    apiConfig,
    apiValues,
    samplers,
    instruct,
    prompt,
    stopSequence,
}: RequestBuilderParams) => {
    const samplerFields = getSamplerFields(apiConfig, apiValues, samplers)
    const fields = await buildFields(apiConfig, apiValues, samplerFields, stopSequence, prompt)

    switch (apiConfig.payload.type) {
        case 'openai':
            return openAIRequest(fields)
        case 'ollama':
            return ollamaRequest(fields)
        case 'cohere':
            return cohereRequest(apiConfig, fields)
        case 'horde':
            return hordeRequest(fields)
        case 'claude':
            return claudeRequest(apiConfig, instruct, fields)
        case 'custom':
            return customRequest(apiConfig, apiValues, fields)
    }
}

const openAIRequest = async ({ payloadFields, model, stop, prompt }: Field) => {
    return {
        ...payloadFields,
        ...model,
        ...stop,
        ...prompt,
    }
}

const ollamaRequest = async ({ payloadFields, model, stop, prompt }: Field) => {
    let keep_alive = 5
    if (payloadFields.keep_alive) {
        keep_alive = payloadFields.keep_alive as number
        delete payloadFields.keep_alive
    }

    return {
        options: {
            ...payloadFields,
            ...stop,
        },
        keep_alive: keep_alive + 'm',
        ...model,
        ...prompt,
        raw: true,
        stream: true,
    }
}

const cohereRequest = async (
    config: APIConfiguration,
    { payloadFields, model, stop, prompt }: Field
) => {
    if (config.request.completionType.type === 'textCompletions') {
        return
    }

    const seedObject = config.request.samplerFields.filter(
        (item) => item.samplerID === SamplerID.SEED
    )

    if (payloadFields?.[seedObject?.[0]?.externalName] === -1)
        delete payloadFields?.[seedObject?.[0]?.externalName]

    const promptData = prompt?.[config.request.promptKey]
    if (!promptData || typeof promptData === 'string') return

    const [preamble, ...history] = promptData
    const last = history.pop()
    return {
        ...payloadFields,
        ...stop,
        ...model,
        preamble: preamble.message,
        chat_history: history,
        [config.request.promptKey]: last?.message ?? '',
    }
}

const claudeRequest = async (
    config: APIConfiguration,
    instruct: InstructType,
    { payloadFields, model, stop, prompt }: Field
) => {
    const systemPrompt = instruct.system_prompt
    const systemRole =
        config.request.completionType.type === 'chatCompletions'
            ? config.request.completionType.systemRole
            : 'system'
    const promptObject = prompt?.[config.request.promptKey]
    const finalPrompt = Array.isArray(promptObject)
        ? {
              [config.request.promptKey]: promptObject.filter(
                  (item) => item.role !== systemRole && item['content']
              ),
          }
        : prompt
    return {
        system: systemPrompt,
        ...payloadFields,
        stream: true,
        ...model,
        ...stop,
        ...finalPrompt,
    }
}

const hordeRequest = async ({ payloadFields, model, stop, prompt }: Field) => {
    return {
        params: {
            ...payloadFields,
            n: 1,
            frmtadsnsp: false,
            frmtrmblln: false,
            frmtrmspch: false,
            frmttriminc: true,
            ...stop,
        },
        ...prompt,
        trusted_workers: false,
        slow_workers: true,
        workers: [],
        worker_blacklist: false,
        models: model.model,
        dry_run: false,
    }
}

const customRequest = async (
    config: APIConfiguration,
    values: APIValues,
    { stop, prompt }: Field
) => {
    if (config.payload.type !== 'custom') return {}
    const modelName = getModelName(config, values)

    let length = 0

    const sampler = SamplersManager.getCurrentSampler()

    if (config.model.useModelContextLength) {
        length = getModelContextLength(config, values) ?? 0
    } else {
    }

    const responseBody = config.payload.customPayload

    config.request.samplerFields.map((item) => {
        responseBody.replaceAll(
            Samplers[item.samplerID].macro,
            sampler?.[item.samplerID]?.toString() ?? ''
        )
    })
    responseBody.replaceAll('{{stop}}', stop.toString())
    responseBody.replaceAll(
        '{{prompt}}',
        typeof prompt === 'object' ? JSON.stringify(prompt) : prompt
    )
    responseBody.replaceAll('{{model}}', modelName.toString())
    return responseBody
}

type Field = Awaited<ReturnType<typeof buildFields>>

const buildFields = async (
    config: APIConfiguration,
    values: APIValues,
    payloadFields: SamplerField,
    stopSeq: string[],
    promptData: string | Message[]
) => {
    // Model Data
    const model = config.features.useModel
        ? {
              model: getModelName(config, values),
          }
        : {}
    // Stop Sequence
    const stop = config.request.useStop ? { [config.request.stopKey]: stopSeq } : {}

    // Seed Data
    const seedObject = config.request.samplerFields.filter(
        (item) => item.samplerID === SamplerID.SEED
    )

    if (seedObject[0] && config.request.removeSeedifNegative) {
        delete payloadFields?.[seedObject?.[0].externalName]
    }

    // Context Length
    const contextLengthObject = config.request.samplerFields.filter(
        (item) => item.samplerID === SamplerID.CONTEXT_LENGTH
    )

    const instructLengthField = payloadFields?.[contextLengthObject?.[0]?.externalName]
    if (instructLengthField) {
        delete payloadFields?.[contextLengthObject?.[0].externalName]
    }

    const modelLengthField = getModelContextLength(config, values)
    const instructLength =
        typeof instructLengthField === 'number' ? instructLengthField : (modelLengthField ?? 0)
    const modelLength = modelLengthField ?? instructLength
    const length = config.model.useModelContextLength
        ? Math.min(modelLength, instructLength)
        : instructLength

    const prompt = { [config.request.promptKey]: promptData }

    return { payloadFields, model, stop, prompt, length }
}

const getNestedValue = (obj: any, path: string) => {
    if (path === '') return obj
    const keys = path.split('.')
    const value = keys.reduce((acc, key) => acc?.[key], obj)
    return value ?? null
}

const getModelName = (config: APIConfiguration, values: APIValues) => {
    let model = undefined
    if (config.features.multipleModels) {
        model = values.model.map((item: any) => getNestedValue(item, config.model.nameParser))
    } else {
        model = getNestedValue(values.model, config.model.nameParser)
    }
    return model
}

const getModelContextLength = (config: APIConfiguration, values: APIValues): number | undefined => {
    const keys = config.model.contextSizeParser.split('.')
    const result = keys.reduce((acc, key) => acc?.[key], values.model)
    return Number.isInteger(result) ? result : undefined
}

const getSamplerFields = (
    config: APIConfiguration,
    values: APIValues,
    samplers: SamplerConfigData
) => {
    let max_length = undefined
    if (config.model.useModelContextLength) {
        max_length = getModelContextLength(config, values)
    }

    return [...config.request.samplerFields]
        .map((item: APISampler) => {
            const value = samplers[item.samplerID]
            const samplerItem = Samplers[item.samplerID]
            let cleanvalue = value
            if (typeof value === 'number')
                if (item.samplerID === 'max_length' && max_length) {
                    cleanvalue = Math.min(value, max_length)
                } else if (samplerItem.values.type === 'integer') cleanvalue = Math.floor(value)
            if (item.samplerID === SamplerID.DRY_SEQUENCE_BREAK) {
                //@ts-expect-error. This is due to a migration
                cleanvalue = (value as string).split(',')
            }
            return { [item.externalName as SamplerID]: cleanvalue }
        })
        .reduce((acc, obj) => Object.assign(acc, obj), {})
}
