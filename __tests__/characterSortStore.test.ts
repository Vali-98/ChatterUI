import { useCharacterSortStore } from '../lib/state/characters/sortStore'

jest.mock('../lib/storage/MMKV', () => ({
    createMMKVStorage: () => ({
        getItem: () => null,
        setItem: jest.fn(),
        removeItem: jest.fn(),
    }),
}))

beforeEach(() => {
    useCharacterSortStore.setState({
        showSearch: true,
        tagFilter: ['fantasy', 'adventure'],
        textFilter: 'Alice',
    })
})

test('opening an already open search preserves the selected tags and text', () => {
    useCharacterSortStore.getState().setShowSearch(true)
    expect(useCharacterSortStore.getState()).toMatchObject({
        showSearch: true,
        tagFilter: ['fantasy', 'adventure'],
        textFilter: 'Alice',
    })
})

test('closing search clears its filters', () => {
    useCharacterSortStore.getState().setShowSearch(false)
    expect(useCharacterSortStore.getState()).toMatchObject({
        showSearch: false,
        tagFilter: [],
        textFilter: '',
    })
})
