import React, { act } from 'react'

import { useContextStatsState } from '../lib/engine/generation/contextStatsState'
import { useContextAllocation } from '../lib/hooks/ContextAllocation'

jest.mock('../lib/engine/API/ContextBuilder', () => ({
    getSystemPrompt: () => ({ components: [{ key: 'system_prompt', tokens: 5 }] }),
}))
jest.mock('../lib/engine/API/connectionStore', () => ({ useActiveConnectionTemplate: () => ({}) }))
jest.mock('react-native-mmkv', () => ({ useMMKVBoolean: () => [false] }))
jest.mock('../lib/hooks/ContextLimit', () => ({ useContextLimit: () => 200 }))
jest.mock('../lib/hooks/liveQuery', () => ({
    useLiveQuerySync: (query: { source: string }) => ({ data: mockData[query.source] }),
}))
jest.mock('../lib/queries/contextAllocation', () => ({
    contextHistory: () => ({ source: 'history' }),
    contextAuthorNotes: () => ({ source: 'notes' }),
    contextLorebooks: () => ({ source: 'books' }),
}))
jest.mock('../lib/summaries/db', () => ({ summaryList: () => ({ source: 'summaries' }) }))
jest.mock('../lib/summaries/settingsStore', () => ({
    useSummarySettingsStore: (select: any) => select({ enabled: true }),
}))
jest.mock('../lib/state/AppMode', () => ({ useAppMode: () => ({ appMode: 'remote' }) }))
jest.mock('../lib/state/characters', () => ({
    Characters: {
        useCharacterState: (select: any) => select({}),
        useUserStore: (select: any) => select({}),
    },
}))
jest.mock('../lib/state/chat', () => ({
    Chats: { useChatState: (select: any) => select({ id: 1 }) },
}))
jest.mock('../lib/state/Instructs', () => ({
    Instructs: {
        useInstruct: (select: any) => select({}),
        defaultInstruct: { system_prompt_format: '{{system_prompt}}', system_prompt: 'test' },
    },
}))
jest.mock('../lib/state/samplerStore', () => ({
    useCurrentSampler: () => ({ data: { genamt: 20 } }),
}))
const { create } = require('react-test-renderer')
Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true })
let mockData: Record<string, any[]>
beforeEach(() => {
    mockData = {
        history: [
            {
                id: 1,
                token_length: 100,
                content_length: 400,
                has_content: 1,
                is_user: true,
                reasoning_length: 0,
            },
        ],
        notes: [],
        books: [],
        summaries: [],
    }
    useContextStatsState.setState({ chats: {}, lastChatId: undefined })
})

test('current history keeps updating after a previous prompt exists', async () => {
    useContextStatsState.setState({ chats: { 1: { total: 1 } as any } })
    let result: ReturnType<typeof useContextAllocation>
    const Consumer = ({ response }: { response: number }) => {
        const value = useContextAllocation(response)
        React.useEffect(() => {
            result = value
        }, [value])
        return null
    }
    let screen: ReturnType<typeof create>
    await act(async () => {
        screen = create(<Consumer response={20} />)
    })
    expect(result!.used).toBe(105)
    expect(result!.free).toBe(75)
    mockData.history.push({
        id: 2,
        token_length: 50,
        content_length: 200,
        has_content: 1,
        is_user: false,
        reasoning_length: 0,
    })
    await act(async () => screen.update(<Consumer response={30} />))
    expect(result!.values.history).toBe(150)
    expect(result!.reserved).toBe(30)
    expect(result!.free).toBe(15)
    await act(async () => screen.unmount())
})

test('author-note reservations are live while lorebook limits remain opportunistic', async () => {
    mockData.notes = [{ chat_id: 1, character_id: null, content: 'note', token_length: 10 }]
    mockData.books = [{ name: 'Lore', token_budget: 500 }]
    let result: ReturnType<typeof useContextAllocation>
    const Consumer = () => {
        const value = useContextAllocation()
        React.useEffect(() => {
            result = value
        }, [value])
        return null
    }
    let screen: ReturnType<typeof create>
    await act(async () => {
        screen = create(<Consumer />)
    })
    expect(result!.reserved).toBe(30)
    expect(result!.free).toBe(65)
    expect(result!.items.reserved.find((item) => item.key === 'chatNotes')?.tokens).toBe(10)
    expect(result!.opportunistic).toEqual([{ key: 'lorebooks', label: 'Lore', tokens: 500 }])
    mockData.notes[0].token_length = 25
    await act(async () => screen.update(<Consumer />))
    expect(result!.reserved).toBe(45)
    await act(async () => screen.unmount())
})
