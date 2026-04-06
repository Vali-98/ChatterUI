import { defaultTemplates } from '../DefaultAPI'
import { APIConfiguration } from '../APIBuilder.types'

describe('MiniMax Provider', () => {
    let minimax: APIConfiguration | undefined

    beforeAll(() => {
        minimax = defaultTemplates.find((t) => t.name === 'MiniMax')
    })

    it('exists in defaultTemplates', () => {
        expect(minimax).toBeDefined()
    })

    it('uses the correct API endpoint', () => {
        expect(minimax?.defaultValues.endpoint).toBe('https://api.minimax.io/v1/chat/completions')
    })

    it('uses the correct model endpoint', () => {
        expect(minimax?.defaultValues.modelEndpoint).toBe('https://api.minimax.io/v1/models')
    })

    it('uses Bearer authorization', () => {
        expect(minimax?.request.authHeader).toBe('Authorization')
        expect(minimax?.request.authPrefix).toBe('Bearer ')
    })

    it('requires an API key', () => {
        expect(minimax?.features.useKey).toBe(true)
    })

    it('supports model selection', () => {
        expect(minimax?.features.useModel).toBe(true)
    })

    it('uses OpenAI-compatible payload format', () => {
        expect(minimax?.payload.type).toBe('openai')
    })

    it('uses chat completions with correct roles', () => {
        const completionType = minimax?.request.completionType
        expect(completionType?.type).toBe('chatCompletions')
        if (completionType?.type === 'chatCompletions') {
            expect(completionType.userRole).toBe('user')
            expect(completionType.assistantRole).toBe('assistant')
            expect(completionType.systemRole).toBe('system')
        }
    })

    it('parses streaming response correctly', () => {
        expect(minimax?.request.responseParsePattern).toBe('choices.0.delta.content')
    })

    it('uses stream request type', () => {
        expect(minimax?.request.requestType).toBe('stream')
    })

    it('includes temperature sampler field', () => {
        const fields = minimax?.request.samplerFields ?? []
        const temperature = fields.find((f) => f.externalName === 'temperature')
        expect(temperature).toBeDefined()
    })

    it('includes max_tokens sampler field', () => {
        const fields = minimax?.request.samplerFields ?? []
        const maxTokens = fields.find((f) => f.externalName === 'max_tokens')
        expect(maxTokens).toBeDefined()
    })

    it('parses model list from data field', () => {
        expect(minimax?.model.modelListParser).toBe('data')
        expect(minimax?.model.nameParser).toBe('id')
    })
})
