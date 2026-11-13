import { act } from 'react'
import { Keyboard } from 'react-native'

import ThemedMarkdownInput, { type MarkdownInputRef } from '../components/input/ThemedMarkdownInput'
import { markdownRules } from '../components/text/markdown/renderRules'
import { useUnfocusTextInput } from '../lib/hooks/UnfocusTextInput'

const mockInput = { focus: jest.fn(), blur: jest.fn(), isFocused: () => true }
jest.mock('@vali98/react-native-markdown-display', () => ({
    MarkdownInput: require('react').forwardRef((props: object, ref: unknown) => {
        require('react').useImperativeHandle(ref, () => mockInput, [])
        return require('react').createElement('MarkdownEditor', props)
    }),
}))
jest.mock('../components/text/markdown/renderRules', () => ({ markdownRules: {} }))
jest.mock('../components/text/markdown/styles', () => ({
    useMarkdownStyles: () => ({ paragraph: { color: '#eeeeee' } }),
}))
jest.mock('../lib/theme/ThemeManager', () => ({
    Theme: {
        useTheme: () => ({
            color: {
                text: { _100: '#ffffff', _400: '#888888', _500: '#777777' },
                primary: { _400: '#7755ff' },
            },
        }),
    },
}))
const { create } = require('react-test-renderer')
Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true })

test('the chat editor preserves controlled text, submit behaviour and keyboard-dismiss focus handling', async () => {
    const onChangeText = jest.fn()
    const onSubmitEditing = jest.fn()
    const listen = jest.spyOn(Keyboard, 'addListener')
    let inputRef!: ReturnType<typeof useUnfocusTextInput<MarkdownInputRef>>
    const Composer = () => {
        const ref = useUnfocusTextInput<MarkdownInputRef>()
        inputRef = ref
        return (
            <ThemedMarkdownInput
                ref={ref}
                value="**draft**"
                onChangeText={onChangeText}
                multiline
                submitBehavior="blurAndSubmit"
                onSubmitEditing={onSubmitEditing}
                style={{ color: '#123456', paddingHorizontal: 8 }}
            />
        )
    }
    let screen: ReturnType<typeof create>
    try {
        await act(async () => {
            screen = create(<Composer />)
        })
        const editor = screen.root.findByType('MarkdownEditor')
        expect(editor.props).toMatchObject({
            value: '**draft**',
            multiline: true,
            submitBehavior: 'blurAndSubmit',
            textColor: '#123456',
            typographer: true,
            renderRules: markdownRules,
            markdownStyle: { paragraph: { color: '#eeeeee' } },
        })
        await act(async () => {
            editor.props.onChangeText('**edited**')
        })
        expect(onChangeText).toHaveBeenCalledWith('**edited**')
        const event = { nativeEvent: { text: '**edited**' } }
        await act(async () => {
            editor.props.onSubmitEditing(event)
        })
        expect(onSubmitEditing).toHaveBeenCalledWith(event)
        inputRef.current?.focus()
        expect(mockInput.focus).toHaveBeenCalled()
        await act(async () => {
            listen.mock.calls[0][1]({} as never)
        })
        expect(mockInput.blur).toHaveBeenCalled()
    } finally {
        await act(async () => screen?.unmount())
        listen.mockRestore()
    }
})
