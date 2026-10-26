import type { ContextBuilderParams } from '../lib/engine/API/ContextBuilder'
import createLorebookDataSource from '../lib/engine/DataSources/lorebookSource'
import { Tokenizer } from '../lib/engine/Tokenizer'
import { Lorebooks } from '../lib/state/lorebooks'

jest.mock('expo-sqlite', () => ({ addDatabaseChangeListener: jest.fn() }))
jest.mock('../lib/engine/Tokenizer', () => ({ Tokenizer: { getTokenizer: jest.fn() } }))
jest.mock('../lib/state/lorebooks', () => ({
    Lorebooks: { db: { query: { activeLorebooks: jest.fn(), lorebookEntryList: jest.fn() } } },
}))
jest.mock('../lib/state/lorebooks/state', () => ({
    useLorebookPreferenceStore: {
        getState: () => ({ insertionLocation: 'afterSystem', insertionDepth: 0 }),
    },
}))
jest.mock('../lib/state/Macros', () => ({
    replaceMacros: (text: string) => text.replaceAll('{{char}}', 'Character'),
}))

beforeEach(() => {
    jest.clearAllMocks()
    jest.mocked(Tokenizer.getTokenizer).mockReturnValue(async (text) => text.length)
    jest.mocked(Lorebooks.db.query.activeLorebooks).mockResolvedValue([
        {
            id: 1,
            name: 'Book',
            token_budget: 100,
            scan_depth: 1,
            recursive_scanning: false,
        } as Awaited<ReturnType<typeof Lorebooks.db.query.activeLorebooks>>[0],
    ])
    jest.mocked(Lorebooks.db.query.lorebookEntryList).mockResolvedValue([
        {
            id: 1,
            name: 'Entry',
            lorebook_id: 1,
            comment: '',
            content: '{{char}}',
            keys: ['new'],
            secondary_keys: [],
            selective: false,
            constant: false,
            case_sensitive: false,
            enable: true,
            priority: 100,
            insertion_order: 100,
        } as Awaited<ReturnType<typeof Lorebooks.db.query.lorebookEntryList>>[0],
    ])
})

test('lorebooks can scan recent history when older history was truncated', async () => {
    const [source] = await createLorebookDataSource()
    const results = await source.retrieve(
        { tokenizer: Tokenizer.getTokenizer() } as ContextBuilderParams,
        [
            { role: 'user', content: 'old' },
            { role: 'user', content: 'new' },
        ],
        100,
        0,
        100,
        false
    )
    expect(results).toHaveLength(1)
    expect(results[0].content).toBe('**Entry**: Character')
    expect(results[0].tokenLength).toBe('**Entry**: Character'.length)
})

test('entry token counts use the current tokenizer instead of a cache from a different model', async () => {
    const [source] = await createLorebookDataSource()
    const read = () =>
        source.retrieve(
            { tokenizer: Tokenizer.getTokenizer() } as ContextBuilderParams,
            [{ role: 'user', content: 'new' }],
            100,
            0,
            100,
            true
        )
    expect((await read())[0].tokenLength).toBe(20)
    jest.mocked(Tokenizer.getTokenizer).mockReturnValue(async () => 5)
    expect((await read())[0].tokenLength).toBe(5)
})
