import { useGuideState } from '../lib/guides/state'
import { useGuideStore } from '../lib/guides/store'

jest.mock('../lib/storage/MMKV', () => ({
    createMMKVStorage: () => ({ getItem: () => null, setItem: jest.fn(), removeItem: jest.fn() }),
}))
const fresh = { origin: 'fresh' as const, onboardingComplete: true }
const legacy = { origin: 'legacy' as const, onboardingComplete: true }
beforeEach(() => {
    useGuideState.setState({ active: undefined, forced: [], targets: {} })
    useGuideStore.setState({ dismissed: {} })
})

test('legacy users do not automatically receive basic guides or get marked as completed', () => {
    const state = useGuideState.getState()
    state.start('main-ui', legacy)
    state.start('chat-ui', legacy)
    state.start('main-drawer', legacy)
    expect(useGuideState.getState().active).toBeUndefined()
    expect(useGuideStore.getState().dismissed).toEqual({})
})

test('fresh users become eligible only after onboarding is complete', () => {
    useGuideState.getState().start('main-ui', { ...fresh, onboardingComplete: false })
    expect(useGuideState.getState().active).toBeUndefined()
    useGuideState.getState().start('main-ui', fresh)
    expect(useGuideState.getState().active).toEqual({ id: 'main-ui', step: 0 })
})

test('ordered steps support Back and only dismiss the guide after its final step', () => {
    const state = useGuideState.getState()
    state.start('main-ui', fresh)
    state.next()
    expect(useGuideState.getState().active?.step).toBe(1)
    state.back()
    expect(useGuideState.getState().active?.step).toBe(0)
    state.next()
    state.next()
    expect(useGuideStore.getState().dismissed['main-ui']).toBeUndefined()
    state.next()
    state.next()
    expect(useGuideState.getState().active).toBeUndefined()
    expect(useGuideStore.getState().dismissed['main-ui']).toBe(true)
    state.start('main-ui', fresh)
    expect(useGuideState.getState().active).toBeUndefined()
})

test('Skip works midway and prevents an automatic restart', () => {
    const state = useGuideState.getState()
    state.start('main-ui', fresh)
    state.next()
    state.skip()
    state.start('main-ui', fresh)
    expect(useGuideState.getState().active).toBeUndefined()
    expect(useGuideStore.getState().dismissed['main-ui']).toBe(true)
})

test('another screen cannot replace the active guide', () => {
    const state = useGuideState.getState()
    state.start('main-ui', fresh)
    state.start('chat-ui', fresh)
    state.stop('chat-ui')
    expect(useGuideState.getState().active?.id).toBe('main-ui')
})

test('leaving a screen preserves eligibility and restarts an unfinished guide from step one', () => {
    const state = useGuideState.getState()
    state.start('main-ui', fresh)
    state.next()
    state.stop('main-ui')
    expect(useGuideStore.getState().dismissed['main-ui']).toBeUndefined()
    state.start('main-ui', fresh)
    expect(useGuideState.getState().active?.step).toBe(0)
})

test('manual replay bypasses legacy eligibility and completion once, without changing history', () => {
    useGuideStore.getState().dismiss('main-ui')
    const state = useGuideState.getState()
    state.replay(['main-ui'])
    state.start('main-ui', legacy)
    expect(useGuideState.getState().active?.id).toBe('main-ui')
    expect(useGuideStore.getState().dismissed['main-ui']).toBe(true)
    state.skip()
    state.start('main-ui', legacy)
    expect(useGuideState.getState().active).toBeUndefined()
})
