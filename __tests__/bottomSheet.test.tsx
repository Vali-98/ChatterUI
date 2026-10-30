import React, { act, createRef } from 'react'
import { Modal, View } from 'react-native'
import BottomSheet, { type BottomSheetRefFunctions } from '../components/views/BottomSheet'

const mockFinishes: ((finished: boolean) => void)[] = []
jest.mock('react-native/Libraries/Modal/Modal', () => ({
    __esModule: true,
    default: ({ children, ...props }: any) =>
        require('react').createElement('Modal', props, children),
}))
jest.mock('react-native-reanimated', () => ({
    __esModule: true,
    default: { View: require('react-native').View },
    useSharedValue: (initial: number) =>
        require('react').useMemo(
            () => ({
                value: initial,
                set(value: number) {
                    this.value = value
                },
            }),
            []
        ),
    useAnimatedStyle: (getStyle: () => unknown) => getStyle(),
    withTiming: (value: number, _options: unknown, callback?: (finished: boolean) => void) => {
        if (callback) mockFinishes.push(callback)
        return value
    },
}))
jest.mock('react-native-worklets', () => ({ scheduleOnRN: (callback: () => void) => callback() }))
jest.mock('react-native-keyboard-controller', () => ({
    useReanimatedKeyboardAnimation: () => ({ height: { value: 0 } }),
}))
jest.mock('react-native-safe-area-context', () => ({
    useSafeAreaInsets: () => ({ top: 0, bottom: 24, left: 0, right: 0 }),
}))
jest.mock('../lib/theme/ThemeManager', () => ({
    Theme: {
        useTheme: () => ({ color: { neutral: { _100: '#fff' } }, borderRadius: { xl2: 24 } }),
    },
}))
jest.mock('react-i18next', () => ({ useTranslation: () => ({ t: (key: string) => key }) }))
const { create } = require('react-test-renderer')
Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true })
beforeEach(() => {
    mockFinishes.length = 0
})

test('backdrop and Back use the same guard; close finishes before onClose fires', () => {
    const ref = createRef<BottomSheetRefFunctions>()
    const guard = jest.fn()
    const onClose = jest.fn()
    const onOpen = jest.fn()
    let renderer: any
    act(() => {
        renderer = create(
            <BottomSheet ref={ref} onRequestClose={guard} onOpen={onOpen} onClose={onClose}>
                <View />
            </BottomSheet>
        )
    })
    act(() => ref.current!.open())
    expect(onOpen).toHaveBeenCalledTimes(1)
    act(() => renderer.root.findByType(Modal).props.onShow())
    act(() =>
        renderer.root
            .findAll(
                (node: any) =>
                    node.props.accessibilityLabel === 'common.actions.close' &&
                    typeof node.props.onPress === 'function'
            )[0]
            .props.onPress()
    )
    act(() => renderer.root.findByType(Modal).props.onRequestClose())
    expect(guard).toHaveBeenCalledTimes(2)
    expect(renderer.root.findByType(Modal).props.visible).toBe(true)
    expect(onClose).not.toHaveBeenCalled()
    act(() => guard.mock.calls[0][0]())
    expect(renderer.root.findByType(Modal).props.visible).toBe(true)
    expect(onClose).not.toHaveBeenCalled()
    act(() => mockFinishes.shift()!(true))
    expect(renderer.root.findByType(Modal).props.visible).toBe(false)
    expect(onClose).toHaveBeenCalledTimes(1)
    act(() => renderer.unmount())
})

test('reopening during exit cancels dismissal and preserves the current session', () => {
    const ref = createRef<BottomSheetRefFunctions>()
    const onClose = jest.fn()
    const onOpen = jest.fn()
    let renderer: any
    act(() => {
        renderer = create(
            <BottomSheet ref={ref} onOpen={onOpen} onClose={onClose}>
                <View />
            </BottomSheet>
        )
    })
    act(() => ref.current!.open())
    act(() => ref.current!.close())
    act(() => ref.current!.open())
    act(() => mockFinishes.shift()!(false))
    expect(renderer.root.findByType(Modal).props.visible).toBe(true)
    expect(onClose).not.toHaveBeenCalled()
    expect(onOpen).toHaveBeenCalledTimes(1)
    act(() => renderer.unmount())
})
