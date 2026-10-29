import merge from 'lodash.merge'

import { SamplerConfigData, SamplerID, Samplers } from '@lib/constants/SamplerData'
import { InstructType } from '@lib/state/Instructs'
import { getNestedValue } from '@lib/utils/Parsing'

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
    const limit = apiConfig.request.stopSequenceLimit
    const requestStops = limit === undefined ? stopSequence : stopSequence.slice(0, limit)
    const samplerFields = getSamplerFields(apiConfig, apiValues, samplers)
    const fields = await buildFields(apiConfig, apiValues, samplerFields, requestStops, prompt)

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
            return customRequest(apiConfig, apiValues, samplers, requestStops, prompt)
    }
}

const openAIRequest = async ({ payloadFields, model, stop, prompt, custom }: Field) => {
    return {
        ...payloadFields,
        ...model,
        ...stop,
        ...prompt,
        ...custom,
    }
}

const ollamaRequest = async ({ payloadFields, model, stop, prompt, custom }: Field) => {
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
        ...custom,
    }
}

const cohereRequest = async (
    config: APIConfiguration,
    { payloadFields, model, stop, prompt, custom }: Field
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
        ...custom,
    }
}

const claudeRequest = async (
    config: APIConfiguration,
    instruct: InstructType,
    { payloadFields, model, stop, prompt, custom }: Field
) => {
    const systemRole =
        config.request.completionType.type === 'chatCompletions'
            ? config.request.completionType.systemRole
            : 'system'
    const promptObject = prompt?.[config.request.promptKey]
    const contentName =
        config.request.completionType.type === 'chatCompletions'
            ? config.request.completionType.contentName
            : 'content'
    const systemPrompt = Array.isArray(promptObject)
        ? promptObject
              .filter((item) => item.role === systemRole)
              .map((item) => {
                  const content = item[contentName]
                  return typeof content === 'string'
                      ? content
                      : content
                            .map((part) =>
                                part.type === 'text' || part.type === 'input_text' ? part.text : ''
                            )
                            .filter(Boolean)
                            .join('\n')
              })
              .join('\n\n')
        : instruct.system_prompt
    const finalPrompt = Array.isArray(promptObject)
        ? {
              [config.request.promptKey]: promptObject.filter(
                  (item) => item.role !== systemRole && item[contentName]
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
        ...custom,
    }
}

const hordeRequest = async ({ payloadFields, model, stop, prompt, custom }: Field) => {
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
        ...custom,
    }
}

const customRequest = (
    config: APIConfiguration,
    values: APIValues,
    samplers: SamplerConfigData,
    stopSequence: string[],
    prompt: string | Message[]
) => {
    if (config.payload.type !== 'custom') return ''
    const replacements = new Map<string, string>([
        ['{{generated_length}}', String(samplers[SamplerID.GENERATED_LENGTH])],
        ['{{stop}}', JSON.stringify(stopSequence)],
        ['{{prompt}}', typeof prompt === 'string' ? prompt : JSON.stringify(prompt)],
        ['{{model}}', String(getModelName(config, values) ?? '')],
    ])
    for (const field of config.request.samplerFields) {
        replacements.set(Samplers[field.samplerID].macro, String(samplers[field.samplerID] ?? ''))
    }
    // One pass: macro-like text inside the prompt must not be expanded a second time.
    return config.payload.customPayload.replace(
        /\{\{[^{}]+\}\}/g,
        (macro) => replacements.get(macro) ?? macro
    )
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

    if (
        seedObject[0] &&
        config.request.removeSeedifNegative &&
        typeof payloadFields[seedObject[0].externalName] === 'number' &&
        (payloadFields[seedObject[0].externalName] as number) < 0
    ) {
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

    if (
        !config.request.removeLength &&
        contextLengthObject[0] &&
        typeof instructLengthField === 'number'
    ) {
        payloadFields[contextLengthObject[0].externalName] = length
    }
    const prompt = { [config.request.promptKey]: promptData }

    const custom = values.customFields ? buildCustomFields(values.customFields) : {}

    return { payloadFields, model, stop, prompt, length, custom }
}

const buildCustomFields = (customFieldsBody: string) => {
    const fieldBody: Record<string, any> = {}

    customFieldsBody
        .split('\n')
        .map((line) => line.trim())
        .filter(Boolean)
        .forEach((line) => {
            const eqIndex = line.indexOf('=')
            if (eqIndex === -1) return

            const key = line.slice(0, eqIndex).trim()
            const rawValue = line.slice(eqIndex + 1).trim()

            let value: any = rawValue
            try {
                value = JSON.parse(rawValue)
            } catch {}

            const parts = key.split('.')
            let current = fieldBody

            for (let i = 0; i < parts.length - 1; i++) {
                const part = parts[i]

                if (
                    current[part] === undefined ||
                    typeof current[part] !== 'object' ||
                    current[part] === null
                ) {
                    current[part] = {}
                }

                current = current[part]
            }

            current[parts[parts.length - 1]] = value
        })

    return fieldBody
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

    return config.request.samplerFields
        .map((item: APISampler) => {
            const value = samplers[item.samplerID]
            const samplerItem = Samplers[item.samplerID]
            let cleanvalue = value
            if (typeof value === 'number') {
                const type = samplerItem.values.type
                if (
                    (type === 'float' || type === 'integer') &&
                    value === samplerItem.values.ignoreIf
                ) {
                    return {}
                }

                if (item.samplerID === 'max_length') {
                    cleanvalue = Math.min(value, max_length ?? value)
                } else if (type === 'integer') {
                    cleanvalue = Math.floor(value)
                }
            }
            if (item.samplerID === SamplerID.DRY_SEQUENCE_BREAK) {
                //@ts-expect-error. This is due to a migration
                cleanvalue = (value as string).split(',')
            }

            if (item.samplerID === SamplerID.REASONING_EFFORT && cleanvalue === 'disabled') {
                return {}
            }
            if (
                (item.samplerID === SamplerID.REASONING_EFFORT ||
                    item.samplerID === SamplerID.REASONING_MAX_TOKENS) &&
                !cleanvalue
            ) {
                return {}
            }
            if (reasoning.includes(item.samplerID)) {
                return { reasoning: { [item.externalName]: cleanvalue } }
            }
            return { [item.externalName]: cleanvalue }
        })
        .reduce((acc, obj) => merge(acc, obj), {})
}

const reasoning = [
    SamplerID.REASONING_EFFORT,
    SamplerID.REASONING_EXCLUDE,
    SamplerID.REASONING_MAX_TOKENS,
]
