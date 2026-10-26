import { defaultSamplerConfig, SamplerID } from '../lib/constants/SamplerData'
import type { APIConfiguration, APIValues } from '../lib/engine/API/APIBuilder.types'
import { defaultTemplates } from '../lib/engine/API/DefaultAPI'
import { buildRequest } from '../lib/engine/API/RequestBuilder'
import type { InstructType } from '../lib/state/Instructs'

const config = (): APIConfiguration => JSON.parse(JSON.stringify(defaultTemplates[0]))
const values: APIValues = {
    ...defaultTemplates[0].defaultValues,
    configName: 'OpenAI',
    model: { id: 'test-model' },
}
const samplers = {
    ...defaultSamplerConfig,
    [SamplerID.TEMPERATURE]: 0.75,
    [SamplerID.GENERATED_LENGTH]: 128,
}
const request = (apiConfig: APIConfiguration, overrides = samplers) =>
    buildRequest({
        apiConfig,
        apiValues: values,
        samplers: overrides,
        instruct: {} as InstructType,
        prompt: 'hello {{model}}',
        stopSequence: ['END'],
    })

test('float samplers are included and only ignoreIf values are omitted', async () => {
    const template = config()
    template.request.samplerFields = [
        { samplerID: SamplerID.TEMPERATURE, externalName: 'temperature' },
    ]
    expect(await request(template)).toMatchObject({ temperature: 0.75 })
    expect(await request(template, { ...samplers, [SamplerID.TEMPERATURE]: 0 })).not.toHaveProperty(
        'temperature'
    )
})

test('removeSeedifNegative retains positive and zero seeds', async () => {
    const template = config()
    template.request.removeSeedifNegative = true
    template.request.samplerFields = [{ samplerID: SamplerID.SEED, externalName: 'seed' }]
    expect(await request(template, { ...samplers, [SamplerID.SEED]: 42 })).toMatchObject({
        seed: 42,
    })
    expect(await request(template, { ...samplers, [SamplerID.SEED]: 0 })).toMatchObject({ seed: 0 })
    expect(await request(template, { ...samplers, [SamplerID.SEED]: -1 })).not.toHaveProperty(
        'seed'
    )
})

test('custom payload substitutes the supplied snapshot in one pass', async () => {
    const template = config()
    template.request.samplerFields = [
        { samplerID: SamplerID.TEMPERATURE, externalName: 'temperature' },
    ]
    template.payload = {
        type: 'custom',
        customPayload: '{{generated_length}}|{{temp}}|{{stop}}|{{prompt}}|{{model}}|{{unknown}}',
    }
    expect(await request(template)).toBe('128|0.75|["END"]|hello {{model}}|test-model|{{unknown}}')
})

test('the configured context-length field is retained unless removeLength is enabled', async () => {
    const template = config()
    template.request.samplerFields = [
        { samplerID: SamplerID.CONTEXT_LENGTH, externalName: 'context_size' },
    ]
    template.request.removeLength = false
    expect(await request(template)).toMatchObject({
        context_size: samplers[SamplerID.CONTEXT_LENGTH],
    })
    template.request.removeLength = true
    expect(await request(template)).not.toHaveProperty('context_size')
})

test('Claude receives the assembled system prompt including card content', async () => {
    const template = config()
    template.payload = { type: 'claude' }
    const result = await buildRequest({
        apiConfig: template,
        apiValues: values,
        samplers,
        instruct: { system_prompt: 'base instruction' } as InstructType,
        prompt: [
            { role: 'system', content: 'base instruction plus character and user descriptions' },
            { role: 'user', content: 'hello' },
        ],
        stopSequence: [],
    })
    expect(result).toMatchObject({
        system: 'base instruction plus character and user descriptions',
        messages: [{ role: 'user', content: 'hello' }],
    })
})
