import { act } from 'react'

import { useCanStartGeneration } from '../lib/engine/generation/hooks'
import { useDeferredTaskState } from '../lib/engine/generation/deferredState'
import {
    attachGenerationSwipe,
    createGeneration,
    removeGenerationOutput,
    updateGeneration,
    useGenerationState,
} from '../lib/engine/generation/state'

jest.mock('react-native-mmkv', () => ({ useMMKVBoolean: () => [true] }))
jest.mock('../lib/state/AppMode', () => ({
    useAppModeStore: require('zustand').create(() => ({ appMode: 'remote' })),
}))
jest.mock('../lib/storage/MMKV', () => ({ mmkv: { getBoolean: () => true } }))
jest.mock('../lib/state/Logger', () => ({ Logger: { stackTrace: jest.fn() } }))
jest.mock('react-native-background-actions', () => ({
    __esModule: true,
    default: { start: jest.fn(), stop: jest.fn() },
}))

const { create } = require('react-test-renderer')
Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true })

test('swipe controls mounted during a new turn become available after every completion', async () => {
    useGenerationState.setState({ generations: {} })
    useDeferredTaskState.setState({ tasks: {} })
    const generation = createGeneration({ chatId: 1, swipeId: -1, mode: 'remote', text: '' })
    attachGenerationSwipe(generation.id, 10)
    const rendered: boolean[] = []
    const Consumer = () => {
        const available = useCanStartGeneration(1)
        rendered.push(available)
        return null
    }
    let screen: ReturnType<typeof create>
    await act(async () => {
        screen = create(<Consumer />)
    })
    expect(rendered.at(-1)).toBe(false)
    await act(async () => {
        updateGeneration(generation.id, { status: 'running' })
        updateGeneration(generation.id, { status: 'saving' })
    })
    expect(rendered.at(-1)).toBe(false)
    await act(async () => {
        updateGeneration(generation.id, { status: 'completed', persisted: true })
        removeGenerationOutput(generation.id)
    })
    expect(rendered.at(-1)).toBe(true)
    let next!: ReturnType<typeof createGeneration>
    await act(async () => {
        next = createGeneration({ chatId: 1, swipeId: 11, mode: 'remote', text: '' })
    })
    expect(rendered.at(-1)).toBe(false)
    await act(async () => {
        removeGenerationOutput(next.id)
    })
    expect(rendered.at(-1)).toBe(true)
    await act(async () => screen.unmount())
})
