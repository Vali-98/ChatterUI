import type {
    MarkdownBlock,
    MarkdownNode,
    MarkdownStyles,
} from '@vali98/react-native-markdown-display'
import { setStringAsync } from 'expo-clipboard'
import { act } from 'react'

import ThemedMarkdown from '../components/text/markdown/ThemedMarkdown'
import { markdownRules } from '../components/text/markdown/renderRules'

const mockMathRender = jest.fn()
const mockCopyRender = jest.fn()
jest.mock('@vali98/react-native-markdown-display', () => ({
    __esModule: true,
    default: (props: object) => require('react').createElement('NativeMarkdown', props),
}))
jest.mock('ratex-react-native', () => ({
    RaTeXView: (props: object) => {
        mockMathRender(props)
        return require('react').createElement('Math', props)
    },
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
    latex_block: { color: '#ffffff', fontSize: 16 },
    latex_inline: { color: '#ffffff', fontSize: 16 },
}

test('native child-node content reaches copy and maths controls without rerendering unchanged content', async () => {
    const code = { ...node('/0', '', 'fence'), language: 'js' }
    const blockMath = node('/1', '', 'latex_block')
    const inlineMath = node('/2', '', 'latex_inline')
    // Highlighted fences can split their source across multiple sibling segments.
    const render = (value = '1', exponent = '2', style = styles) => {
        const block: MarkdownBlock = {
            id: 1,
            revision: 1,
            revealStart: 0,
            revealLength: 0,
            nodes: [
                code,
                node('/0/0', '/0', 'syntax_keyword', 'const'),
                node('/0/1', '/0', 'text', ` value = ${value}\n`),
                blockMath,
                node('/1/0', '/1', 'text', `x^${exponent}`),
                inlineMath,
                node('/2/0', '/2', 'text', 'x'),
            ],
        }
        return (
            <>
                {markdownRules.fence({ node: code, block, children: [], styles: style })}
                {markdownRules.latex_block({ node: blockMath, block, children: [], styles: style })}
                {markdownRules.latex_inline({
                    node: inlineMath,
                    block,
                    children: [],
                    styles: style,
                })}
            </>
        )
    }
    let screen: ReturnType<typeof create>
    await act(async () => {
        screen = create(render())
    })
    expect(mockMathRender).toHaveBeenCalledTimes(2)
    expect(mockMathRender.mock.calls.map(([props]) => props.displayMode)).toEqual([true, false])
    expect(mockCopyRender).toHaveBeenCalledTimes(1)
    mockMathRender.mockClear()
    mockCopyRender.mockClear()

    await act(async () => {
        screen.update(render())
    })
    expect(mockMathRender).not.toHaveBeenCalled()
    expect(mockCopyRender).not.toHaveBeenCalled()

    await act(async () => {
        screen.update(render('2', '3'))
    })
    expect(mockMathRender).toHaveBeenCalledTimes(1)
    expect(mockMathRender.mock.calls[0][0].latex).toBe('x^3')
    expect(mockCopyRender).toHaveBeenCalledTimes(1)
    await act(async () => {
        await screen.root.findByType('CopyButton').props.onPress()
    })
    expect(setStringAsync).toHaveBeenLastCalledWith('const value = 2')

    mockMathRender.mockClear()
    mockCopyRender.mockClear()
    await act(async () => {
        screen.update(
            render('2', '3', {
                ...styles,
                fenceHeader: { color: '#ff0000' },
                latex_block: { color: '#ff0000', fontSize: 20 },
            })
        )
    })
    expect(mockMathRender).toHaveBeenCalledTimes(1)
    expect(mockMathRender.mock.calls[0][0]).toMatchObject({ color: '#ff0000', fontSize: 20 })
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
        typographer: true,
        renderRules: markdownRules,
    })
    await act(async () => {
        screen.update(<ThemedMarkdown streaming={false}>{'**finished**'}</ThemedMarkdown>)
    })
    expect(screen.root.findByType('NativeMarkdown').props).toMatchObject({
        children: '**finished**',
        streaming: false,
    })
    await act(async () => screen.unmount())
})
