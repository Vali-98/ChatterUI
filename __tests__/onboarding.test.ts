import { prepareOnboarding, useOnboardingStore } from '../lib/onboarding/store'
import { Characters } from '../lib/state/characters'
import { useGuideState } from '../lib/guides/state'
import { mmkv } from '../lib/storage/MMKV'

jest.mock('../lib/storage/MMKV', () => ({
    mmkv: { getNumber: jest.fn() },
    createMMKVStorage: () => ({ getItem: () => null, setItem: jest.fn(), removeItem: jest.fn() }),
}))
jest.mock('../lib/state/characters', () => ({
    Characters: { db: { query: { cardList: jest.fn() } } },
}))
beforeEach(() => {
    jest.clearAllMocks()
    useGuideState.setState({ active: undefined, forced: [] })
    useOnboardingStore.setState({ status: undefined, origin: undefined, step: 0 })
    jest.mocked(mmkv.getNumber).mockReturnValue(undefined)
    jest.mocked(Characters.db.query.cardList).mockResolvedValue([])
})
test('fresh install is marked in progress before default cards exist', async () => {
    await prepareOnboarding()
    expect(useOnboardingStore.getState().status).toBe('inProgress')
})
test('legacy startup evidence skips onboarding without touching cards', async () => {
    jest.mocked(mmkv.getNumber).mockReturnValue(8)
    await prepareOnboarding()
    expect(useOnboardingStore.getState().status).toBe('complete')
    expect(Characters.db.query.cardList).not.toHaveBeenCalled()
})
test('existing user data skips onboarding even without the startup key', async () => {
    jest.mocked(Characters.db.query.cardList).mockResolvedValue([{ id: 1 }] as never)
    await prepareOnboarding()
    expect(useOnboardingStore.getState().status).toBe('complete')
})
test('interrupted onboarding keeps its step even after startup has created defaults', async () => {
    useOnboardingStore.setState({ status: 'inProgress', step: 3 })
    jest.mocked(mmkv.getNumber).mockReturnValue(8)
    await prepareOnboarding()
    expect(useOnboardingStore.getState()).toMatchObject({ status: 'inProgress', step: 3 })
    expect(Characters.db.query.cardList).not.toHaveBeenCalled()
})

test('forcing onboarding resets its progress without deleting existing app data', () => {
    useOnboardingStore.setState({
        status: 'complete',
        step: 5,
        connectionId: 3,
        origin: 'legacy',
    })
    useOnboardingStore.getState().restart()
    expect(useOnboardingStore.getState()).toMatchObject({
        status: 'inProgress',
        step: 0,
        connectionId: undefined,
        origin: 'legacy',
    })
    expect(Characters.db.query.cardList).not.toHaveBeenCalled()
})

test('existing completed onboarding without an origin is classified as legacy', async () => {
    useOnboardingStore.setState({ status: 'complete', origin: undefined })
    await prepareOnboarding()
    expect(useOnboardingStore.getState().origin).toBe('legacy')
})
