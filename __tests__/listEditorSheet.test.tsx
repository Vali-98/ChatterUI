import React, { act, useState } from 'react'
import { useKeyboardHandler } from 'react-native-keyboard-controller'

import ListEditorSheet from '../components/input/ListEditorSheet'

jest.mock('react-i18next', () => ({ useTranslation: () => ({ t: (key: string) => key }) }))
jest.mock('react-native-keyboard-controller', () => ({
    useKeyboardHandler: jest.fn(),
    useReanimatedKeyboardAnimation: () => ({ progress: { value: 0 } }),
}))
jest.mock('react-native-worklets', () => ({
    scheduleOnRN: (callback: (...args: any[]) => void, ...args: any[]) => callback(...args),
}))
jest.mock('../components/views/BottomSheet', () => ({
    __esModule: true,
    default: ({ children, onOpen }: any) =>
        require('react').createElement('Sheet', { onOpen }, children),
    BottomSheetHeader: () => null,
    useBottomSheetRef: () => require('react').useRef(null),
}))
jest.mock('../components/views/EdgeFade', () => ({
    EdgeFadeScrollView: ({ children }: any) => children,
}))
jest.mock('../components/views/ListCard', () => ({
    __esModule: true,
    default: ({ children }: any) => children,
}))
jest.mock('../components/buttons/ThemedButton', () => ({
    __esModule: true,
    default: (props: any) => require('react').createElement('Button', props),
}))
jest.mock('../components/buttons/IconButton', () =>
    jest.requireMock('../components/buttons/ThemedButton')
)
jest.mock('../components/input/ThemedTextInput', () => ({
    __esModule: true,
    default: Object.assign((props: any) => require('react').createElement('Input', props), {
        Action: () => null,
    }),
}))
jest.mock('../components/text/TText', () => ({
    __esModule: true,
    default: ({ children }: any) => require('react').createElement('Label', null, children),
}))
jest.mock('../lib/theme/ThemeManager', () => ({
    Theme: {
        useTheme: () => ({
            color: { neutral: { _200: '#222', _300: '#333' }, error: { _400: '#f00' } },
        }),
    },
}))
jest.mock('react-native-reanimated', () => ({
    __esModule: true,
    default: {
        View: (props: any) => require('react').createElement('AnimatedView', props, props.children),
    },
    useSharedValue: (value: number) => ({ value, set: jest.fn() }),
    useAnimatedStyle: (style: () => unknown) => style(),
    withTiming: (value: number) => value,
    ZoomIn: { duration: () => undefined },
    FadeIn: { duration: () => undefined },
    FadeOut: { duration: () => undefined },
    LinearTransition: { duration: () => undefined },
}))
const { create } = require('react-test-renderer')
Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true })

test('synchronous tag selection updates immediately without disabling the sheet', () => {
    const Harness = () => {
        const [value, setValue] = useState<string[]>([])
        return (
            <ListEditorSheet
                value={value}
                onChangeValue={setValue}
                suggestions={['Fantasy', 'Adventure']}
                keyExtractor={(item) => item}
                labelExtractor={(item) => item}
            />
        )
    }
    let renderer: any
    act(() => {
        renderer = create(<Harness />)
    })
    act(() => {
        renderer.root
            .findAllByType('Button')
            .find((node: any) => node.props.label === 'Fantasy')
            .props.onPress()
    })
    expect(
        renderer.root.findAllByType('Button').filter((node: any) => node.props.label === 'Fantasy')
    ).toHaveLength(0)
    expect(
        renderer.root.findAllByType('Label').some((node: any) => node.props.children === 'Fantasy')
    ).toBe(true)
    expect(renderer.root.findAllByType('Button').some((node: any) => node.props.disabled)).toBe(
        false
    )
    act(() => renderer.unmount())
})

test('Enter adds tags to the sheet draft and Save commits the list', async () => {
    const onChangeValue = jest.fn()
    let renderer: any
    act(() => {
        renderer = create(
            <ListEditorSheet
                value={['Existing']}
                onChangeValue={onChangeValue}
                keyExtractor={(item) => item}
                labelExtractor={(item) => item}
                createItem={(text) => text.trim()}
                commitMode="confirm"
            />
        )
    })
    act(() => renderer.root.findByType('Sheet').props.onOpen())
    act(() => renderer.root.findByType('Input').props.onChangeText(' New tag '))
    act(() => renderer.root.findByType('Input').props.onSubmitEditing())
    expect(onChangeValue).not.toHaveBeenCalled()
    expect(renderer.root.findByType('Input').props.value).toBe('')
    expect(renderer.root.findByType('Input').props.submitBehavior).toBe('submit')
    expect(
        renderer.root
            .findAllByType('Button')
            .filter((node: any) => node.props.label !== 'common.actions.add')
            .some((node: any) => node.props.disabled)
    ).toBe(false)
    await act(async () => {
        renderer.root
            .findAllByType('Button')
            .find((node: any) => node.props.label === 'common.actions.save')
            .props.onPress()
    })
    expect(onChangeValue).toHaveBeenCalledWith(['Existing', 'New tag'])
    act(() => renderer.unmount())
})

test('suggestions stay mounted through the keyboard animation and unlock after dismissal', () => {
    let renderer: any
    act(() => {
        renderer = create(
            <ListEditorSheet
                value={[]}
                onChangeValue={jest.fn()}
                suggestions={['Fantasy']}
                createItem={(text) => text}
                keyExtractor={(item) => item}
                labelExtractor={(item) => item}
            />
        )
    })
    const suggestion = () =>
        renderer.root.findAllByType('Button').find((node: any) => node.props.label === 'Fantasy')
    expect(suggestion()).toBeDefined()
    act(() => renderer.root.findByType('Input').props.onFocus())
    const suggestionsPanel = () =>
        renderer.root
            .findAllByType('AnimatedView')
            .find((node: any) => node.props.testID === 'list-editor-suggestions')
    expect(suggestionsPanel().props.pointerEvents).toBe('none')
    const handler = jest.mocked(useKeyboardHandler).mock.calls.at(-1)![0]
    act(() => handler.onEnd!({ height: 0 } as any))
    expect(suggestionsPanel().props.pointerEvents).toBe('auto')
    expect(suggestion()).toBeDefined()
    act(() => renderer.unmount())
})

test('search appears at the threshold and supports overriding it', () => {
    const props = {
        value: [] as string[],
        onChangeValue: jest.fn(),
        suggestions: ['One', 'Two'],
        keyExtractor: (item: string) => item,
        labelExtractor: (item: string) => item,
    }
    let renderer: any
    act(() => {
        renderer = create(<ListEditorSheet {...props} />)
    })
    expect(renderer.root.findAllByType('Input')).toHaveLength(0)
    act(() => renderer.update(<ListEditorSheet {...props} filterThreshold={2} />))
    expect(renderer.root.findAllByType('Input')).toHaveLength(1)
    act(() => renderer.root.findByType('Input').props.onChangeText('missing'))
    expect(renderer.root.findAllByType('Input')).toHaveLength(1)
    act(() => renderer.unmount())
})

test('multiline list entries preserve literal whitespace and regex characters', async () => {
    const onChangeValue = jest.fn()
    const literal = ' \n<end>\\d+\t '
    let renderer: any
    act(() => {
        renderer = create(
            <ListEditorSheet
                value={[] as string[]}
                onChangeValue={onChangeValue}
                keyExtractor={(item) => item}
                labelExtractor={(item) => item}
                createItem={(text) => text}
                multiline
                commitMode="confirm"
            />
        )
    })
    act(() => renderer.root.findByType('Sheet').props.onOpen())
    expect(renderer.root.findByType('Input').props.submitBehavior).toBe('newline')
    expect(renderer.root.findByType('Input').props.onSubmitEditing).toBeUndefined()
    act(() => renderer.root.findByType('Input').props.onChangeText(literal))
    act(() =>
        renderer.root
            .findAllByType('Button')
            .find((node: any) => node.props.label === 'common.actions.add')
            .props.onPress()
    )
    await act(async () =>
        renderer.root
            .findAllByType('Button')
            .find((node: any) => node.props.label === 'common.actions.save')
            .props.onPress()
    )
    expect(onChangeValue).toHaveBeenCalledWith([literal])
    act(() => renderer.unmount())
})
