import {
    collectContext,
    buildChatCompletionContext,
    ContextBuilderParams,
    getSystemPrompt,
} from '../lib/engine/API/ContextBuilder'
import { defaultTemplates } from '../lib/engine/API/DefaultAPI'
import type { DataSource, DataSourceResult } from '../lib/engine/DataSources/types'
import type { CharacterCard } from '../lib/state/characters/types'
import type { ChatMessage } from '../lib/state/chat/types'
import type { InstructType } from '../lib/state/Instructs'
import { Logger } from '../lib/state/Logger'
import { mmkv } from '../lib/storage/MMKV'
import { DEFAULT_CONTINUATION_PROMPT } from '../lib/constants/GlobalValues'
import { readBase64Async } from '../lib/utils/File'

jest.mock('i18next', () => ({ t: (key: string) => key }))

jest.mock('../lib/hooks/TextFilter', () => ({
    useTextFilterStore: { getState: () => ({ sendFilteredText: true, filter: [] }) },
}))
jest.mock('../lib/state/AppMode', () => ({
    useAppModeStore: { getState: () => ({ appMode: 'remote' }) },
}))
jest.mock('../lib/state/Instructs', () => ({ defaultSystemPromptFormat: '{{system_prompt}}' }))
jest.mock('../lib/state/Logger', () => ({
    Logger: { info: jest.fn(), warn: jest.fn(), warnToast: jest.fn(), errorToast: jest.fn() },
}))
jest.mock('../lib/state/Macros', () => ({
    getActiveMacros: () => ({ char: 'Character', user: 'User' }),
    replaceMacros: (text: string) =>
        jest
            .requireActual('../lib/utils/Macros')
            .applyMacros(text, { char: 'Character', user: 'User' }),
}))
jest.mock('../lib/storage/MMKV', () => ({
    mmkv: { getBoolean: () => false, getString: jest.fn() },
}))
jest.mock('../lib/utils/File', () => ({ readBase64Async: jest.fn() }))

const message = (text: string, id: number): ChatMessage => ({
    id,
    chat_id: 1,
    is_user: true,
    name: 'User',
    order: 0,
    swipe_id: 0,
    attachments: [],
    swipes: [
        {
            id,
            entry_id: id,
            swipe: text,
            active: true,
            token_length: null,
            reset_length: null,
            timings: null,
            send_date: new Date(),
            gen_started: new Date(),
            gen_finished: new Date(),
        },
    ],
})
const parameters = (): ContextBuilderParams & { mode: 'chat' } => ({
    apiConfig: defaultTemplates[0],
    apiValues: { ...defaultTemplates[0].defaultValues, configName: 'OpenAI' },
    character: { name: 'Character' } as CharacterCard,
    user: { name: 'User' } as CharacterCard,
    instruct: {
        system_prompt_format: '',
        system_prompt: '',
        timestamp: false,
        names: false,
        hide_think_tags: false,
    } as InstructType,
    messages: [message('old', 1), message('new', 2)],
    mode: 'chat',
    maxLength: 100,
    tokenizer: async (text) => text.length,
    chatTokenizer: async (entry) => entry.swipes[0].swipe.length,
    cache: {
        characterCounts: {
            descriptionTokens: 30,
            personalityTokens: 0,
            scenarioTokens: 0,
            exampleTokens: 0,
            otherParticipantName: 'User',
        },
        userCounts: {
            descriptionTokens: 20,
            personalityTokens: 0,
            scenarioTokens: 0,
            exampleTokens: 0,
            otherParticipantName: 'Character',
        },
        instructCache: {
            characterName: 'Character',
            userName: 'User',
            system_prompt_length: 10,
            system_prefix_length: 0,
            system_suffix_length: 2,
            input_prefix_length: 0,
            input_suffix_length: 0,
            output_prefix_length: 0,
            output_suffix_length: 0,
            last_output_prefix_length: 0,
            user_alignment_message_length: 0,
        },
    },
})

const source = (content: string, position: DataSourceResult['position']): DataSource => ({
    name: content,
    priority: 1,
    tokenBudget: 0,
    retrieve: jest.fn(async () => [
        { content, position, source: content, tokenLength: content.length },
    ]),
})

test('data sources receive chronological history and relative insertion locations remain chronological', async () => {
    const params = parameters()
    const first = source('after', { type: 'relative', location: 'afterLast' })
    params.dataSources = [first]
    const result = await collectContext(params)
    expect(jest.mocked(first.retrieve).mock.calls[0][1].map((item) => item.content)).toEqual([
        'old',
        'new',
    ])
    expect(result.messages.map((item) => item.content)).toEqual(['old', 'new', 'after'])
    params.dataSources = [source('before', { type: 'relative', location: 'beforeLast' })]
    expect((await collectContext(params)).messages.map((item) => item.content)).toEqual([
        'old',
        'before',
        'new',
    ])
})

test('indexed insertion is a depth counted from the newest message', async () => {
    const params = parameters()
    params.dataSources = [source('note', { type: 'index', location: 1 })]
    expect((await collectContext(params)).messages.map((item) => item.content)).toEqual([
        'old',
        'note',
        'new',
    ])
    params.dataSources = [source('note', { type: 'index', location: 100 })]
    expect((await collectContext(params)).messages.map((item) => item.content)).toEqual([
        'note',
        'old',
        'new',
    ])
})

test('reserved tokens are charged once and unused reservation is available to later sources', async () => {
    const params = parameters()
    params.maxLength = 13
    const reserved = source('note', { type: 'relative', location: 'afterSystem' })
    reserved.tokenBudget = 4
    const later = source('ok', { type: 'relative', location: 'afterLast' })
    later.priority = 2
    params.dataSources = [reserved, later]
    const result = await collectContext(params)
    expect(result.messages.map((item) => item.content)).toEqual(['old', 'new', 'ok'])
    expect(result.systemPrompt).toBe('\nnote')
})

test('a source cannot exceed the remaining budget', async () => {
    const params = parameters()
    params.maxLength = 7
    params.dataSources = [source('too long', { type: 'relative', location: 'afterLast' })]
    expect((await collectContext(params)).messages.map((item) => item.content)).toEqual([
        'old',
        'new',
    ])
})

test('budgeting accounts for macro-expanded message text and literal system text', async () => {
    const params = parameters()
    params.instruct.system_prompt_format = 'literal'
    params.messages = [message('{{char}}', 1)]
    params.maxLength = 15 // 7 literal characters + 9 expanded name characters do not fit.
    expect((await collectContext(params)).messages).toEqual([])
})

test('system prompt cache counts only referenced slots, including repeated slots', () => {
    const params = parameters()
    params.instruct.system_prompt_format = '{{system_prompt}}{{system_prompt}}'
    params.instruct.system_prompt = 'system'
    const result = getSystemPrompt({
        ...params,
        ...params.cache,
        usePrefix: false,
        useSuffix: false,
    })
    expect(result.systemPrompt).toBe('systemsystem')
    expect(result.systemPromptLength).toBe(20)
})

test('system allocation reports only card fields included by the prompt format', () => {
    const params = parameters()
    params.instruct.system_prompt_format =
        '{{system_prompt}}{{character_desc}}{{user_desc}}{{personality}}'
    params.instruct.personality = false
    const result = getSystemPrompt({
        ...params,
        ...params.cache,
        usePrefix: false,
        useSuffix: false,
    })
    const parts = Object.fromEntries(result.components.map((item) => [item.key, item.tokens]))
    expect(parts.system_prompt).toBe(10)
    expect(parts.character_desc).toBe(30)
    expect(parts.user_desc).toBe(20)
    expect(parts.personality).toBe(0)
    expect(parts.scenario).toBe(0)
    expect(result.systemPromptLength).toBe(60)
})

test('chat payloads honor the configured provider role names', async () => {
    const params = parameters()
    params.apiConfig = JSON.parse(JSON.stringify(params.apiConfig))
    params.apiConfig.request.completionType = {
        type: 'chatCompletions',
        userRole: 'USER',
        assistantRole: 'CHATBOT',
        systemRole: 'SYSTEM',
        contentName: 'message',
    }
    params.messages[1].is_user = false
    const result = await buildChatCompletionContext(params)
    expect(result?.map((item) => item.role)).toEqual(['SYSTEM', 'USER', 'CHATBOT'])
})

test('an oversized system prompt warns and still produces a payload', async () => {
    const params = parameters()
    params.maxLength = 1
    params.instruct.system_prompt_format = 'A system prompt longer than the budget'
    const result = await buildChatCompletionContext(params)
    expect(result?.[0].content).toBe(params.instruct.system_prompt_format)
    expect(Logger.warnToast).toHaveBeenCalledWith('generation.warn.systemPromptExceedsContext')
})

test('native chat requests omit reasoning even when the inline hide setting is disabled', async () => {
    const params = parameters()
    params.messages[0].is_user = false
    params.messages[0].swipes[0].reasoning = {
        swipe_id: 1,
        content: 'Private reasoning',
        reset_length: null,
    }
    const result = await buildChatCompletionContext(params)
    expect(JSON.stringify(result)).not.toContain('Private reasoning')
    expect(JSON.stringify(result)).not.toContain('<think>')
})

test('formatted text reasoning is included only when explicitly allowed and counted in the budget', async () => {
    const params = parameters()
    params.messages = [message('Answer', 1)]
    params.messages[0].is_user = false
    params.messages[0].swipes[0].reasoning = {
        swipe_id: 1,
        content: 'Private reasoning',
        reset_length: null,
    }
    params.maxLength = 1000
    const included = await collectContext({ ...params, mode: 'text' })
    expect(included.messages[0].content).toBe('<think>Private reasoning</think>\nAnswer')
    params.instruct.hide_think_tags = true
    const excluded = await collectContext({ ...params, mode: 'text' })
    expect(excluded.messages[0].content).toBe('Answer')
})

test('native chat content keeps user-authored think tags as literal message content', async () => {
    const params = parameters()
    params.messages = [message('An example: <think>literal</think>', 1)]
    params.instruct.hide_think_tags = true
    const result = await collectContext(params)
    expect(result.messages[0].content).toBe('An example: <think>literal</think>')
})

test('reasoning-only final swipes are included when formatted-text policy permits them', async () => {
    const params = parameters()
    params.messages = [message('', 1)]
    params.messages[0].is_user = false
    params.messages[0].swipes[0].reasoning = {
        swipe_id: 1,
        content: 'Unfinished thought',
        reset_length: null,
    }
    params.maxLength = 1000
    expect((await collectContext({ ...params, mode: 'text' })).messages[0].content).toBe(
        '<think>Unfinished thought</think>\n'
    )
    params.instruct.hide_think_tags = true
    expect((await collectContext({ ...params, mode: 'text' })).messages).toEqual([])
})

test.each([
    ['audio/mpeg', 'mp3'],
    ['audio/wav', 'wav'],
])('audio input maps %s to API format %s', async (mimeType, format) => {
    const params = parameters()
    params.instruct.send_audio = true
    params.messages = [message('Listen to this clip', 1)]
    params.messages[0].attachments = [
        {
            id: 1,
            chat_entry_id: 1,
            uri: 'file:///clip',
            name: 'clip',
            type: 'audio',
            mime_type: mimeType,
            size: 100,
        },
    ]
    jest.mocked(readBase64Async).mockResolvedValue('encoded-audio')
    const payload = await buildChatCompletionContext(params)
    expect(payload).toEqual(
        expect.arrayContaining([
            expect.objectContaining({
                role: 'user',
                content: expect.arrayContaining([
                    { type: 'input_audio', input_audio: { data: 'encoded-audio', format } },
                ]),
            }),
        ])
    )
})

test('Google continuation ends with a synthetic user instruction after the existing assistant response', async () => {
    const params = parameters()
    params.apiConfig = defaultTemplates.find((template) => template.name === 'Google AI Studio')!
    params.messages = [message('Question', 1), { ...message('Partial answer', 2), is_user: false }]
    const payload = await buildChatCompletionContext(params)
    expect(payload?.slice(-2)).toEqual([
        { role: 'assistant', content: 'Partial answer' },
        { role: 'user', content: expect.stringContaining('Continue the previous response') },
    ])
    expect(params.messages).toHaveLength(2)
})

test('endWithUserTurn does not add an instruction when the request already ends with a user message', async () => {
    const params = parameters()
    params.apiConfig = defaultTemplates.find((template) => template.name === 'Google AI Studio')!
    params.messages = [{ ...message('Answer', 1), is_user: false }, message('Next question', 2)]
    const payload = await buildChatCompletionContext(params)
    expect(payload?.at(-1)).toEqual({ role: 'user', content: 'Next question' })
    expect(payload).toHaveLength(3)
})

test('templates without endWithUserTurn retain assistant prefill', async () => {
    const params = parameters()
    params.messages = [{ ...message('Partial answer', 1), is_user: false }]
    expect((await buildChatCompletionContext(params))?.at(-1)).toEqual({
        role: 'assistant',
        content: 'Partial answer',
    })
})

test.each([
    ['Custom continuation instruction', 'Custom continuation instruction'],
    ['   ', DEFAULT_CONTINUATION_PROMPT],
])(
    'continuation uses the configured instruction or the default for blank text',
    async (saved, expected) => {
        const params = parameters()
        params.apiConfig = defaultTemplates.find(
            (template) => template.name === 'Google AI Studio'
        )!
        params.messages = [{ ...message('Partial answer', 1), is_user: false }]
        jest.mocked(mmkv.getString).mockReturnValueOnce(saved)
        expect((await buildChatCompletionContext(params))?.at(-1)).toEqual({
            role: 'user',
            content: expected,
        })
    }
)

test('paged history matches full history and stops fetching as soon as context is full', async () => {
    const params = parameters()
    const all = ['a', 'b', 'c', 'd'].map((text, index) => message(text, index + 1))
    params.maxLength = 3
    const full = await collectContext({ ...params, messages: all })
    const loadOlder = jest.fn(async () => all.slice(0, 2))
    const paged = await collectContext({
        ...params,
        messages: all.slice(2),
        messageLoader: { loadOlder },
    })
    expect(paged.messages).toEqual(full.messages)
    expect(paged.messages.map((entry) => entry.content)).toEqual(['b', 'c', 'd'])
    expect(loadOlder).toHaveBeenCalledTimes(1)
})

test('the loader receives the actual remaining budget and can fill an underestimated window', async () => {
    const params = parameters()
    params.messages = []
    params.maxLength = 3
    const loadOlder = jest
        .fn()
        .mockResolvedValueOnce([message('d', 4)])
        .mockResolvedValueOnce([message('c', 3)])
        .mockResolvedValueOnce([message('b', 2)])
        .mockResolvedValueOnce([message('a', 1)])
    const result = await collectContext({ ...params, messageLoader: { loadOlder } })
    expect(result.messages.map((entry) => entry.content)).toEqual(['b', 'c', 'd'])
    expect(loadOlder.mock.calls).toEqual([[3], [2], [1], [0]])
})

test('a latest empty assistant placeholder is skipped when the first messages arrive through the loader', async () => {
    const params = parameters()
    params.messages = []
    const loadOlder = jest
        .fn()
        .mockResolvedValueOnce([message('question', 1), { ...message('', 2), is_user: false }])
        .mockResolvedValueOnce([])
    const result = await collectContext({ ...params, messageLoader: { loadOlder } })
    expect(result.messages.map((entry) => entry.content)).toEqual(['question'])
})
