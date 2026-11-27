import type {
    MarkdownBlock,
    MarkdownNode,
    MarkdownStyles,
} from '@vali98/react-native-markdown-display'
import { setStringAsync } from 'expo-clipboard'
import { act } from 'react'
import { Text } from 'react-native'

import ThemedMarkdown from '../components/text/markdown/ThemedMarkdown'
import { markdownRules } from '../components/text/markdown/renderRules'

const mockCopyRender = jest.fn()
jest.mock('@vali98/react-native-markdown-display', () => ({
    __esModule: true,
    default: (props: object) => require('react').createElement('NativeMarkdown', props),
}))
jest.mock('../components/buttons/IconButton', () => ({
    __esModule: true,
    default: (props: object) => {
        mockCopyRender(props)
        return require('react').createElement('CopyButton', props)
    },
}))
jest.mock('expo-clipboard', () => ({ setStringAsync: jest.fn(async () => {}) }))
jest.mock('expo-image', () => ({ Image: () => null }))
jest.mock('i18next', () => ({ t: (key: string) => key }))
jest.mock('../components/text/markdown/styles', () => ({ useMarkdownStyles: () => ({}) }))
jest.mock('../lib/state/Logger', () => ({
    Logger: { infoToast: jest.fn(), errorToast: jest.fn() },
}))

const { create } = require('react-test-renderer')
Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true })
const node = (id: string, parentId: string, type: string, content = ''): MarkdownNode => ({
    id,
    parentId,
    type,
    content,
    destination: '',
    marker: '',
    sourceStart: -1,
    sourceEnd: -1,
})
const styles: MarkdownStyles = {
    body: { color: '#ffffff' },
    paragraph: { fontSize: 16 },
    fence: { fontFamily: 'monospace' },
    fenceHeader: { color: '#aaaaaa' },
}

test('highlighted code reaches the copy control without rerendering unchanged content', async () => {
    const code = { ...node('/0', '', 'fence'), language: 'js' }
    // Highlighted fences can split their source across multiple sibling segments.
    const render = (value = '1', style = styles) => {
        const block: MarkdownBlock = {
            id: 1,
            revision: 1,
            revealStart: 0,
            revealLength: 0,
            nodes: [
                code,
                node('/0/0', '/0', 'syntax_keyword', 'const'),
                node('/0/1', '/0', 'text', ` value = ${value}\n`),
            ],
        }
        return (
            <>
                {markdownRules.fence({
                    node: code,
                    block,
                    children: [
                        <Text key="keyword" testID="keyword" style={{ color: '#ff8800' }}>
                            const
                        </Text>,
                        <Text key="source">{` value = ${value}\n`}</Text>,
                    ],
                    styles: style,
                })}
            </>
        )
    }
    let screen: ReturnType<typeof create>
    await act(async () => {
        screen = create(render())
    })
    expect(mockCopyRender).toHaveBeenCalledTimes(1)
    expect(screen.root.findByProps({ testID: 'keyword' }).props.style).toEqual({
        color: '#ff8800',
    })
    mockCopyRender.mockClear()

    await act(async () => {
        screen.update(render())
    })
    expect(mockCopyRender).not.toHaveBeenCalled()

    await act(async () => {
        screen.update(render('2'))
    })
    expect(mockCopyRender).toHaveBeenCalledTimes(1)
    await act(async () => {
        await screen.root.findByType('CopyButton').props.onPress()
    })
    expect(setStringAsync).toHaveBeenLastCalledWith('const value = 2')

    mockCopyRender.mockClear()
    await act(async () => {
        screen.update(
            render('2', {
                ...styles,
                fenceHeader: { color: '#ff0000' },
            })
        )
    })
    expect(mockCopyRender).toHaveBeenCalledTimes(1)
    await act(async () => screen.unmount())
})

test('the themed display forwards raw streamed text and the final streaming state to the native controller', async () => {
    let screen: ReturnType<typeof create>
    await act(async () => {
        screen = create(<ThemedMarkdown streaming>{'**unfinished '}</ThemedMarkdown>)
    })
    expect(screen.root.findByType('NativeMarkdown').props).toMatchObject({
        children: '**unfinished ',
        streaming: true,
        animate: true,
        typographer: true,
        renderRules: markdownRules,
    })
    await act(async () => {
        screen.update(<ThemedMarkdown streaming={false}>{'**finished**'}</ThemedMarkdown>)
    })
    expect(screen.root.findByType('NativeMarkdown').props).toMatchObject({
        children: '**finished**',
        streaming: false,
        animate: false,
    })
    await act(async () => screen.unmount())
})
