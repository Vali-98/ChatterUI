// __tests__/textFilter.tsx

import React from 'react'
import TestRenderer from 'react-test-renderer'

jest.mock('react-native-simple-toast', () => ({ SHORT: 0, show: jest.fn() }))

jest.mock('react-native-mmkv', () => {
    const store = new Map<string, string>()
    return {
        createMMKV: () => ({
            set: (key: string, value: string) => store.set(key, value),
            getString: (key: string) => store.get(key),
            remove: (key: string) => store.delete(key),
        }),
    }
})

import { useTextFilter, useTextFilterStore } from '@lib/hooks/TextFilter'

type RegexResult = { result: string; found: boolean }

const filterText = (filters: string[], input: string): RegexResult => {
    let output: RegexResult = { result: '', found: false }
    const Probe = () => {
        output = useTextFilter(input)
        return null
    }

    let renderer: TestRenderer.ReactTestRenderer
    TestRenderer.act(() => {
        useTextFilterStore.setState({ filter: filters })
        renderer = TestRenderer.create(<Probe />)
    })
    // the store is shared, so unmount before the next case changes the filters
    TestRenderer.act(() => {
        renderer.unmount()
    })

    return output
}

describe('useTextFilter', () => {
    test('applies every filter, not just the last one', () => {
        const { result } = filterText(['alpha', 'beta'], 'alpha beta gamma')

        expect(result).not.toContain('alpha')
        expect(result).not.toContain('beta')
    })

    test('reports found when only an earlier filter matches', () => {
        const { result, found } = filterText(['secret', 'nomatch'], 'a secret value')

        expect(result).toBe('a  value')
        expect(found).toBe(true)
    })

    test('filters applied in order can match text uncovered by an earlier filter', () => {
        const { result } = filterText(['<hidden>', 'o+ps'], 'keep<hidden>ooops')

        expect(result).toBe('keep')
    })

    test('(control) keeps the matches made before an invalid pattern aborts the loop', () => {
        const { result, found } = filterText(['secret', '('], 'a secret value')

        expect(result).toBe('a  value')
        expect(found).toBe(true)
    })

    test('(control) returns the input untouched when there are no filters', () => {
        const { result, found } = filterText([], 'alpha beta gamma')

        expect(result).toBe('alpha beta gamma')
        expect(found).toBe(false)
    })

    test('(control) a single filter removes every case-insensitive occurrence', () => {
        const { result, found } = filterText(['alpha'], 'Alpha beta ALPHA')

        expect(result).toBe(' beta ')
        expect(found).toBe(true)
    })

    test('(control) reports not found when no filter matches', () => {
        const { result, found } = filterText(['nomatch', 'alsonomatch'], 'alpha beta gamma')

        expect(result).toBe('alpha beta gamma')
        expect(found).toBe(false)
    })

    test('(control) an empty input string stays empty', () => {
        const { result, found } = filterText(['alpha', 'beta'], '')

        expect(result).toBe('')
        expect(found).toBe(false)
    })
})
