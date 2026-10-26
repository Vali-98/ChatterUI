import { defaultSamplerConfig } from '../lib/constants/SamplerData'
import { useConnectionStore } from '../lib/engine/API/connectionStore'
import { Llama } from '../lib/engine/Local/LlamaLocal'
import { getDataSources } from '../lib/engine/DataSources'
import { captureGenerationInputs, prepareGenerationContext } from '../lib/engine/generation/inputs'
import { Tokenizer } from '../lib/engine/Tokenizer'
import { useTextFilterStore } from '../lib/hooks/TextFilter'
import { Characters } from '../lib/state/characters'
import { buildBlankCharacterCard } from '../lib/state/characters/schema'
import { Chats } from '../lib/state/chat'
import { Instructs } from '../lib/state/Instructs'

jest.mock('../lib/engine/API/connectionStore', () => ({
    useConnectionStore: { getState: jest.fn() },
}))
jest.mock('../lib/engine/DataSources', () => ({ getDataSources: jest.fn(async () => []) }))
jest.mock('../lib/engine/Local/LlamaLocal', () => ({
    Llama: {
        useLlamaPreferencesStore: {
            getState: () => ({ config: { context_length: 4096, threads: 2 } }),
        },
        useLlamaModelStore: { getState: jest.fn(() => ({ tokenLength: async () => 1 })) },
    },
}))
jest.mock('../lib/engine/Tokenizer', () => ({
    Tokenizer: { useTokenizerState: { getState: jest.fn() } },
}))
jest.mock('../lib/hooks/TextFilter', () => ({ useTextFilterStore: { getState: jest.fn() } }))
jest.mock('../lib/state/characters', () => ({
    Characters: {
        db: { live: { card: jest.fn() } },
        useUserStore: { getState: jest.fn() },
    },
}))
jest.mock('../lib/state/chat', () => ({
    Chats: { db: { live: { chat: jest.fn() } }, actions: { countMessageTokens: jest.fn() } },
}))
jest.mock('../lib/state/Instructs', () => ({
    commonStopStrings: ['COMMON'],
    Instructs: { useInstruct: { getState: jest.fn() } },
}))
jest.mock('../lib/state/samplerStore', () => ({
    getCurrentSampler: () => require('../lib/constants/SamplerData').defaultSamplerConfig,
}))
jest.mock('../lib/storage/MMKV', () => ({ mmkv: { getBoolean: () => false } }))

const user = {
    ...buildBlankCharacterCard('User One').data,
    id: 2,
    description: 'I speak to {{char}}.',
}
const character = {
    ...buildBlankCharacterCard('Character One').data,
    id: 1,
    description: 'I speak to {{user}}.',
}
const template = require('../lib/engine/API/DefaultAPI').defaultTemplates[0]
let connection: any
let instruct: any
beforeEach(() => {
    jest.clearAllMocks()
    user.name = 'User One'
    character.name = 'Character One'
    connection = {
        ...template.defaultValues,
        model: { name: 'Model A' },
        configName: template.name,
        id: 'a',
    }
    instruct = {
        name: 'Format',
        system_prompt: '{{char}} meets {{user}}',
        system_prompt_format: '{{system_prompt}} {{elephant}}',
        system_prefix: '',
        system_suffix: '',
        input_prefix: '{{user}}: ',
        input_suffix: '',
        output_prefix: '{{char}}: ',
        last_output_prefix: '{{char}}: ',
        output_suffix: '',
        user_alignment_message: 'actual alignment',
        stop_sequence: 'END',
        names: true,
        use_common_stop: true,
    }
    jest.mocked(useConnectionStore.getState).mockReturnValue({
        connections: [connection],
        activeConnectionId: 'a',
        getTemplates: () => [template],
    } as any)
    jest.mocked(Instructs.useInstruct.getState).mockReturnValue({ data: instruct } as any)
    jest.mocked(Characters.useUserStore.getState).mockReturnValue({ card: user } as any)
    jest.mocked(Characters.db.live.card).mockReturnValue({ sync: () => character } as any)
    jest.mocked(Chats.db.live.chat).mockReturnValue({
        sync: () => ({ character_id: 1, messages: [] }),
    } as any)
    jest.mocked(Tokenizer.useTokenizerState.getState).mockReturnValue({
        model: { tokenize: async (text: string) => ({ tokens: [...text] }) },
    } as any)
    jest.mocked(useTextFilterStore.getState).mockReturnValue({
        sendFilteredText: false,
        filter: ['hidden'],
    } as any)
})

test('captures cards, model, samplers, formatting and macros before any preparation awaits', async () => {
    const inputs = captureGenerationInputs(10, 'remote')
    connection.model.name = 'Model B'
    user.name = 'User Two'
    character.name = 'Character Two'
    instruct.input_prefix = 'new format'
    expect(inputs.apiValues?.model.name).toBe('Model A')
    expect(inputs.user.name).toBe('User One')
    expect(inputs.character.name).toBe('Character One')
    expect(inputs.instruct.input_prefix).toBe('User One: ')
    expect(inputs.macros).toMatchObject({ char: 'Character One', user: 'User One' })
    expect(inputs.samplers).toEqual(defaultSamplerConfig)
    expect(inputs.samplers).not.toBe(defaultSamplerConfig)
    const fields = await prepareGenerationContext(inputs)
    expect(fields.cache.characterCounts.descriptionTokens).toBe('I speak to User One.'.length)
    expect(fields.cache.userCounts.descriptionTokens).toBe('I speak to Character One.'.length)
    expect(fields.cache.instructCache.user_alignment_message_length).toBe('actual alignment'.length)
})

test('snapshot tokenizer keeps its model even when the selected tokenizer changes', async () => {
    const inputs = captureGenerationInputs(10, 'remote')
    jest.mocked(Tokenizer.useTokenizerState.getState).mockReturnValue({
        model: { tokenize: async () => ({ tokens: [] }) },
    } as any)
    expect(await inputs.tokenizer('hello')).toBe(5)
})

test('uses the owning chat character and both participant names in stop sequences', () => {
    const inputs = captureGenerationInputs(10, 'remote')
    expect(Characters.db.live.card).toHaveBeenCalledWith(1)
    expect(inputs.stopSequence).toEqual(['User One :', 'Character One :', 'END', 'COMMON'])
    expect(inputs.instruct.system_prompt_format).toBe('{{system_prompt}} {{elephant}}')
    expect(getDataSources).toHaveBeenCalledWith(
        10,
        expect.objectContaining({ macros: inputs.macros })
    )
})

test('missing owning chat fails before requesting any sources', () => {
    jest.mocked(Chats.db.live.chat).mockReturnValue({ sync: () => undefined } as any)
    expect(() => captureGenerationInputs(10, 'remote')).toThrow('Chat no longer exists')
    expect(getDataSources).not.toHaveBeenCalled()
})

test('local tokenization waits for model loading and then stays bound to that context', async () => {
    const inputs = captureGenerationInputs(10, 'local')
    let resolved = false
    const pending = inputs.tokenizer('hello').then((length) => {
        resolved = true
        return length
    })
    await Promise.resolve()
    expect(resolved).toBe(false)
    jest.mocked(Llama.useLlamaModelStore.getState).mockReturnValue({
        context: { tokenize: async () => ({ tokens: [1, 2, 3] }) },
    } as any)
    inputs.activateLocalTokenizer()
    jest.mocked(Llama.useLlamaModelStore.getState).mockReturnValue({
        context: { tokenize: async () => ({ tokens: [] }) },
    } as any)
    expect(await pending).toBe(3)
})
