import { SQLiteSyncRelationalQuery } from 'drizzle-orm/sqlite-core/query-builders/query'
import React, { act } from 'react'

import { useSwipeGeneration } from '../lib/engine/generation/hooks'
import {
    createGeneration,
    removeGenerationOutput,
    updateGeneration,
    useGenerationState,
} from '../lib/engine/generation/state'
import { useLiveQuerySync } from '../lib/hooks/liveQuery'
import { createDatabaseQueryObserver, publishDatabaseChanges } from '../lib/queries/databaseQuery'

jest.mock('expo-sqlite', () => ({
    addDatabaseChangeListener: jest.fn(() => ({ remove: jest.fn() })),
}))
jest.mock('../db/db', () => ({ sqliteDB: { databasePath: '/db.db' } }))
jest.mock('react-native-background-actions', () => ({
    __esModule: true,
    default: { start: jest.fn(), stop: jest.fn() },
}))
jest.mock('react-native-mmkv', () => ({ useMMKVBoolean: jest.fn() }))
jest.mock('../lib/state/AppMode', () => ({ useAppModeStore: jest.fn() }))
jest.mock('../lib/storage/MMKV', () => ({ mmkv: { getBoolean: jest.fn() } }))
jest.mock('../lib/state/Logger', () => ({ Logger: { stackTrace: jest.fn() } }))
const { create } = require('react-test-renderer')
Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true })

test('committed snapshots replace output without UI acknowledgment, equality checks or native notifications', async () => {
    useGenerationState.setState({ generations: {} })
    const generation = createGeneration({
        chatId: 1,
        swipeId: 1,
        mode: 'remote',
        text: 'complete response',
    })
    let saved = ''
    const query = Object.assign(Object.create(SQLiteSyncRelationalQuery.prototype), {
        mode: 'first',
        sync: () => ({ text: saved }),
    }) as SQLiteSyncRelationalQuery<{ text: string }>
    const rendered: string[] = []
    const Consumer = () => {
        const { data } = useLiveQuerySync(query, {
            key: ['swipe', 1],
            watch: [{ table: 'chat_swipes', rowId: 1 }],
        })
        const current = useSwipeGeneration(1)
        rendered.push(current?.text ?? data.text)
        return null
    }
    let screen: ReturnType<typeof create>
    await act(async () => {
        screen = create(<Consumer />)
    })
    rendered.length = 0
    await act(async () => {
        saved = 'complete response'
        publishDatabaseChanges([{ table: 'chat_swipes', rowId: 1 }])
        updateGeneration(generation.id, { status: 'completed', persisted: true })
        removeGenerationOutput(generation.id)
    })
    expect(useGenerationState.getState().generations[generation.id]).toBeUndefined()
    expect(rendered.length).toBeGreaterThan(0)
    expect(rendered.every((text) => text === 'complete response')).toBe(true)
    await act(async () => {
        saved = 'later edit'
        publishDatabaseChanges([{ table: 'chat_swipes', rowId: 1 }])
    })
    expect(rendered.at(-1)).toBe('later edit')
    await act(async () => {
        screen.unmount()
    })
    expect(() => publishDatabaseChanges([{ table: 'chat_swipes' }])).not.toThrow()
})

test('commit publication respects an empty watched-row list', () => {
    const read = jest.fn(() => ({ text: 'saved' }))
    const query = Object.assign(Object.create(SQLiteSyncRelationalQuery.prototype), {
        mode: 'first',
        sync: read,
    }) as SQLiteSyncRelationalQuery<{ text: string }>
    const observer = createDatabaseQueryObserver(query, {
        watch: [{ table: 'chat_swipes', rowId: [] }],
    })
    const unsubscribe = observer.subscribe(() => {})
    read.mockClear()
    publishDatabaseChanges([{ table: 'chat_swipes' }])
    expect(read).not.toHaveBeenCalled()
    unsubscribe()
})

test('answer and reasoning snapshots replace their generation buffers together', async () => {
    useGenerationState.setState({ generations: {} })
    const generation = createGeneration({
        chatId: 2,
        swipeId: 2,
        mode: 'remote',
        text: 'Answer',
        reasoning: 'Thought',
    })
    let saved = { text: '', reasoning: '' }
    const query = Object.assign(Object.create(SQLiteSyncRelationalQuery.prototype), {
        mode: 'first',
        sync: () => saved,
    }) as SQLiteSyncRelationalQuery<typeof saved>
    const rendered: (typeof saved)[] = []
    const Consumer = () => {
        const { data } = useLiveQuerySync(query, {
            key: ['swipe-with-reasoning', 2],
            watch: [
                { table: 'chat_swipes', rowId: 2 },
                { table: 'swipe_reasoning', rowId: 2 },
            ],
        })
        const current = useSwipeGeneration(2)
        rendered.push({
            text: current?.text ?? data.text,
            reasoning: current?.reasoning ?? data.reasoning,
        })
        return null
    }
    let screen: ReturnType<typeof create>
    await act(async () => {
        screen = create(<Consumer />)
    })
    rendered.length = 0
    await act(async () => {
        saved = { text: 'Answer', reasoning: 'Thought' }
        publishDatabaseChanges([
            { table: 'chat_swipes', rowId: 2 },
            { table: 'swipe_reasoning', rowId: 2 },
        ])
        updateGeneration(generation.id, { status: 'completed', persisted: true })
        removeGenerationOutput(generation.id)
    })
    expect(rendered.length).toBeGreaterThan(0)
    expect(
        rendered.every((value) => value.text === 'Answer' && value.reasoning === 'Thought')
    ).toBe(true)
    await act(async () => {
        screen!.unmount()
    })
})
