import { parseCharacterCardV2 } from '../../../state/CharacterCardV2'
import { getCharacterPromptLayers } from '../CharacterCardPrompt'
import { buildChatCompletionContext, buildTextCompletionContext } from '../ContextBuilder'
import { buildRequest } from '../RequestBuilder'

jest.mock('@lib/markdown/ThinkTags', () => ({ buildThinkRules: () => [] }))
jest.mock('@lib/state/Instructs', () => ({
    defaultSystemPromptFormat:
        '{{system_prefix}}{{system_prompt}}\n{{character_desc}}\n{{personality}}\n{{scenario}}\n{{user_desc}}{{system_suffix}}',
}))
jest.mock('@lib/state/Logger', () => ({
    Logger: { info: jest.fn(), warn: jest.fn(), warnToast: jest.fn() },
}))
jest.mock('@lib/state/Macros', () => ({ replaceMacros: (text: string) => text }))
jest.mock('@lib/state/SamplerState', () => ({
    SamplersManager: { getCurrentSampler: () => ({}) },
}))
jest.mock('@lib/storage/MMKV', () => ({ mmkv: { getBoolean: () => false } }))
jest.mock('@lib/utils/File', () => ({ readBase64Async: jest.fn() }))

const globalPrompt = 'GLOBAL RP RULES'

const makeCard = (overrides: Record<string, unknown> = {}) => ({
    name: 'Ava',
    description: 'DESCRIPTION_SENTINEL',
    personality: 'PERSONALITY_SENTINEL',
    scenario: 'SCENARIO_SENTINEL',
    mes_example: 'EXAMPLE_SENTINEL',
    first_mes: 'Hello',
    system_prompt: '',
    post_history_instructions: '',
    creator_notes: 'CREATOR_NOTES_MUST_NOT_APPEAR',
    creator: 'CREATOR_METADATA_MUST_NOT_APPEAR',
    character_version: '1.0',
    tags: [{ tag: { tag: 'TAG_MUST_NOT_APPEAR' } }],
    alternate_greetings: [],
    ...overrides,
})

const user = makeCard({
    name: 'User',
    description: 'USER_PERSONA_SENTINEL',
    personality: '',
    scenario: '',
    mes_example: '',
})

const instruct = {
    name: 'ChatML',
    system_prompt: globalPrompt,
    system_prompt_format:
        '{{system_prefix}}{{system_prompt}}\n{{character_desc}}\n{{personality}}\n{{scenario}}\n{{user_desc}}{{system_suffix}}',
    system_prefix: '<|im_start|>system\n',
    system_suffix: '<|im_end|>\n',
    input_prefix: '<|im_start|>user\n',
    input_suffix: '<|im_end|>\n',
    output_prefix: '<|im_start|>assistant\n',
    last_output_prefix: '<|im_start|>assistant\n',
    output_suffix: '<|im_end|>\n',
    stop_sequence: '<|im_end|>',
    activation_regex: '',
    user_alignment_message: '',
    wrap: false,
    macro: false,
    names: false,
    names_force_groups: false,
    timestamp: false,
    examples: true,
    format_type: 0,
    scenario: true,
    personality: true,
    hide_think_tags: true,
    use_common_stop: true,
    send_images: true,
    send_audio: true,
    send_documents: true,
    last_image_only: true,
}

const cache = {
    userCache: {
        otherName: 'Ava',
        description_length: 0,
        examples_length: 0,
        personality_length: 0,
        scenario_length: 0,
    },
    characterCache: {
        otherName: 'User',
        description_length: 0,
        examples_length: 0,
        personality_length: 0,
        scenario_length: 0,
    },
    instructCache: {
        charName: 'Ava',
        userName: 'User',
        system_prompt_length: 0,
        system_prefix_length: 0,
        system_suffix_length: 0,
        input_prefix_length: 0,
        input_suffix_length: 0,
        output_prefix_length: 0,
        last_output_prefix_length: 0,
        output_suffix_length: 0,
        user_alignment_message_length: 0,
    },
}

const messages = [
    {
        id: 1,
        chat_id: 1,
        name: 'User',
        is_user: true,
        order: 0,
        swipe_id: 0,
        swipes: [
            {
                id: 1,
                entry_id: 1,
                swipe: 'HISTORY_SENTINEL',
                send_date: new Date('2026-01-01T00:00:00Z'),
                gen_started: new Date('2026-01-01T00:00:00Z'),
                gen_finished: new Date('2026-01-01T00:00:00Z'),
                timings: null,
            },
        ],
        attachments: [],
    },
    {
        id: -1,
        chat_id: 1,
        name: 'Ava',
        is_user: false,
        order: 1,
        swipe_id: 0,
        swipes: [
            {
                id: -1,
                entry_id: -1,
                swipe: '',
                send_date: new Date('2026-01-01T00:00:00Z'),
                gen_started: new Date('2026-01-01T00:00:00Z'),
                gen_finished: new Date('2026-01-01T00:00:00Z'),
                timings: null,
            },
        ],
        attachments: [],
    },
]

const chatConfig = {
    features: { useFirstMessage: false },
    request: {
        completionType: {
            type: 'chatCompletions' as const,
            userRole: 'user',
            systemRole: 'system',
            assistantRole: 'assistant',
            contentName: 'content',
        },
    },
}

const textConfig = {
    features: { useFirstMessage: false },
    request: { completionType: { type: 'textCompletions' as const } },
}

const buildParams = (
    character = makeCard(),
    apiConfig: object = chatConfig,
    selectedInstruct = instruct
) => ({
    apiConfig: apiConfig as never,
    apiValues: { prefill: '', firstMessage: '' } as never,
    messages: structuredClone(messages) as never,
    character: character as never,
    instruct: selectedInstruct as never,
    user: user as never,
    tokenizer: (text: string) => text.length,
    chatTokenizer: async () => 1,
    maxLength: 100_000,
    cache: cache,
})

describe('Character Card V2 prompt semantics', () => {
    test('an empty card system prompt preserves the global/default behavior', async () => {
        const output = await buildChatCompletionContext(buildParams())
        expect(output?.[0].content).toContain(globalPrompt)
    })

    test('a custom card system prompt replaces the global instruction', async () => {
        const output = await buildChatCompletionContext(
            buildParams(makeCard({ system_prompt: 'CUSTOM_SYSTEM_SENTINEL' }))
        )
        expect(output?.[0].content).toContain('CUSTOM_SYSTEM_SENTINEL')
        expect(output?.[0].content).not.toContain(globalPrompt)
    })

    test('{{original}} inserts the global instruction exactly once', async () => {
        const output = await buildChatCompletionContext(
            buildParams(makeCard({ system_prompt: `Before {{original}} After` }))
        )
        const system = output?.[0].content as string
        expect(system).toBeTruthy()
        expect(system.match(new RegExp(globalPrompt, 'g'))).toHaveLength(1)
        expect(system).toContain(`Before ${globalPrompt} After`)
    })

    test('post-history instructions are emitted after conversation history', async () => {
        const instructWithDefaultPost = {
            ...instruct,
            user_alignment_message: 'DEFAULT_LATE_SENTINEL',
        }
        const output = await buildChatCompletionContext(
            buildParams(
                makeCard({ post_history_instructions: 'LATE_SENTINEL {{original}}' }),
                chatConfig,
                instructWithDefaultPost
            )
        )
        expect(output?.at(-1)).toEqual({
            role: 'system',
            content: 'LATE_SENTINEL DEFAULT_LATE_SENTINEL',
        })
        expect(output?.findIndex((message) => message.content === 'HISTORY_SENTINEL')).toBeLessThan(
            output?.findIndex(
                (message) => message.content === 'LATE_SENTINEL DEFAULT_LATE_SENTINEL'
            ) ?? -1
        )
    })

    test('character definitions, examples, user persona, and history remain present', async () => {
        const output = await buildChatCompletionContext(buildParams())
        const serialized = JSON.stringify(output)
        for (const sentinel of [
            'DESCRIPTION_SENTINEL',
            'PERSONALITY_SENTINEL',
            'SCENARIO_SENTINEL',
            'EXAMPLE_SENTINEL',
            'USER_PERSONA_SENTINEL',
            'HISTORY_SENTINEL',
        ]) {
            expect(serialized).toContain(sentinel)
        }
    })

    test('creator notes, creator metadata, and tags never become prompt content', async () => {
        const output = await buildChatCompletionContext(buildParams())
        const serialized = JSON.stringify(output)
        expect(serialized).not.toContain('CREATOR_NOTES_MUST_NOT_APPEAR')
        expect(serialized).not.toContain('CREATOR_METADATA_MUST_NOT_APPEAR')
        expect(serialized).not.toContain('TAG_MUST_NOT_APPEAR')
    })

    test('text/local Instruct formatting still wraps semantic layers with ChatML tokens', async () => {
        const output = await buildTextCompletionContext(
            buildParams(
                makeCard({
                    system_prompt: 'CUSTOM_SYSTEM_SENTINEL',
                    post_history_instructions: 'LATE_SENTINEL',
                }),
                textConfig
            )
        )
        expect(output).toContain('<|im_start|>system\nCUSTOM_SYSTEM_SENTINEL')
        expect(output).toContain('<|im_start|>system\nLATE_SENTINEL<|im_end|>')
        expect(output).toContain('<|im_start|>user\nHISTORY_SENTINEL<|im_end|>')
        expect(output).toContain('<|im_start|>assistant\n')
    })

    test('JSON and PNG-extracted V2 text produce identical semantic layers', () => {
        const source = {
            spec: 'chara_card_v2',
            spec_version: '2.0',
            data: makeCard({ tags: ['rp'], alternate_greetings: ['Hi'] }),
        }
        const jsonImport = parseCharacterCardV2(source)
        const pngExtractedImport = parseCharacterCardV2(JSON.stringify(source))
        expect(jsonImport.success).toBe(true)
        expect(pngExtractedImport.success).toBe(true)
        if (!jsonImport.success || !pngExtractedImport.success) return
        expect(getCharacterPromptLayers(jsonImport.data.data, globalPrompt)).toEqual(
            getCharacterPromptLayers(pngExtractedImport.data.data, globalPrompt)
        )
    })

    test('provider adaptation preserves both early and late system layers', async () => {
        const apiConfig = {
            features: { useModel: false },
            request: {
                completionType: {
                    type: 'chatCompletions',
                    userRole: 'user',
                    systemRole: 'system',
                    assistantRole: 'assistant',
                    contentName: 'content',
                },
                samplerFields: [],
                useStop: false,
                stopKey: 'stop_sequences',
                promptKey: 'messages',
            },
            payload: { type: 'claude' },
            model: { useModelContextLength: false, contextSizeParser: '' },
        }
        const request = await buildRequest({
            apiConfig: apiConfig as never,
            apiValues: { model: undefined } as never,
            samplers: {} as never,
            instruct: instruct as never,
            stopSequence: [],
            prompt: [
                { role: 'system', content: 'EARLY_SYSTEM' },
                { role: 'user', content: 'HISTORY' },
                { role: 'system', content: 'LATE_SYSTEM' },
            ],
        })
        expect(request).toMatchObject({
            system: 'EARLY_SYSTEM\n\nLATE_SYSTEM',
            messages: [{ role: 'user', content: 'HISTORY' }],
        })
    })
})
