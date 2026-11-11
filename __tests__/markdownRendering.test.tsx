import { setStringAsync } from 'expo-clipboard'
import { act } from 'react'

import ThemedMarkdown from '../components/text/markdown/ThemedMarkdown'

const mockMathRender = jest.fn()
const mockCopyRender = jest.fn()
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

test('later tokens leave completed maths and copy controls alone, while content and style changes update them', async () => {
    const styles = {
        body: { color: '#ffffff' },
        fence: { fontFamily: 'monospace' },
        fenceHeader: { color: '#aaaaaa' },
        latex_block: { color: '#ffffff', fontSize: 16 },
        latex_inline: { color: '#ffffff', fontSize: 16 },
    }
    const content = '```js\nconst value = 1\n```\n\n$$x^2$$\n\nInline $x$.\n\nLater text'
    const render = (text: string, style = styles) => (
        <ThemedMarkdown style={style}>{text}</ThemedMarkdown>
    )
    let screen: ReturnType<typeof create>
    await act(async () => {
        screen = create(render(content))
    })
    expect(mockMathRender).toHaveBeenCalledTimes(2)
    expect(mockCopyRender).toHaveBeenCalledTimes(1)
    mockMathRender.mockClear()
    mockCopyRender.mockClear()

    await act(async () => {
        screen.update(render(content + ' keeps arriving'))
    })
    expect(mockMathRender).not.toHaveBeenCalled()
    expect(mockCopyRender).not.toHaveBeenCalled()

    const edited = content.replace('value = 1', 'value = 2').replace('x^2', 'x^3')
    await act(async () => {
        screen.update(render(edited))
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
            render(edited, {
                ...styles,
                fenceHeader: { color: '#ff0000' },
                latex_block: { color: '#ff0000', fontSize: 20 },
            })
        )
    })
    expect(mockMathRender).toHaveBeenCalledTimes(1)
    expect(mockMathRender.mock.calls[0][0]).toMatchObject({
        color: '#ff0000',
        style: { fontSize: 20 },
    })
    expect(mockCopyRender).toHaveBeenCalledTimes(1)
    await act(async () => screen.unmount())
})
