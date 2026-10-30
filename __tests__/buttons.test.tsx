import { act } from 'react'
import { StyleSheet } from 'react-native'

import IconButton from '../components/buttons/IconButton'
import ThemedButton, { type ButtonVariant } from '../components/buttons/ThemedButton'

jest.mock('../lib/components/AnimatedComponents', () => ({
    AnimatedPressable: (props: object) => require('react').createElement('Button', props),
}))
jest.mock('../components/text/TText', () => ({
    __esModule: true,
    default: (props: object) => require('react').createElement('Label', props),
}))
jest.mock('react-native-reanimated', () => ({
    useSharedValue: (value: number) => ({ value, set: jest.fn() }),
    useAnimatedStyle: (style: () => unknown) => style(),
    withTiming: (value: number) => value,
}))
jest.mock('@react-native-vector-icons/ant-design/static', () => ({
    __esModule: true,
    default: (props: object) => require('react').createElement('AntDesign', props),
}))
jest.mock('@react-native-vector-icons/material-icons/static', () => ({
    __esModule: true,
    default: (props: object) => require('react').createElement('MaterialIcon', props),
}))
jest.mock('@react-native-vector-icons/octicons/static', () => ({
    __esModule: true,
    default: (props: object) => require('react').createElement('Octicon', props),
}))
jest.mock('../lib/theme/ThemeManager', () => ({
    Theme: {
        useTheme: () => ({
            color: {
                neutral: { _100: '#111111', _200: '#222222', _300: '#333333', _400: '#444444' },
                text: { _100: '#ffffff', _200: '#eeeeee', _500: '#777777' },
                primary: { _400: '#9977ff', _500: '#7755cc', _700: '#bb99ff' },
                warning: { _400: '#ddaa22', _500: '#cc9911', _700: '#ffcc44' },
                error: { _400: '#ff6666', _500: '#cc3333', _700: '#ff8888' },
            },
            borderWidth: { m: 1 },
            borderRadius: { m: 8 },
            spacing: { m: 8, xl: 20 },
        }),
    },
}))
const { create } = require('react-test-renderer')
Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true })

test.each<ButtonVariant>(['primary', 'secondary', 'tertiary'])(
    'disabling a %s button preserves its dimensions and overrides caller colours',
    (variant) => {
        let renderer: any
        const props = {
            variant,
            level: 'error' as const,
            viewStyle: [{ paddingHorizontal: 12, paddingVertical: 6 }, { borderRadius: 16 }],
            labelStyle: [{ color: '#ff0000' }],
            iconStyle: [{ color: '#ff0000' }],
        }
        act(() => {
            renderer = create(<ThemedButton {...props} label="Delete" iconName="delete" />)
        })
        const dimensions = () => {
            const style = StyleSheet.flatten(renderer.root.findByType('Button').props.style)
            return [
                style.paddingHorizontal,
                style.paddingVertical,
                style.borderWidth,
                style.borderRadius,
            ]
        }
        const enabledDimensions = dimensions()
        act(() => {
            renderer.update(<ThemedButton {...props} label="Delete" iconName="delete" disabled />)
        })
        expect(renderer.root.findByType('Button').props.disabled).toBe(true)
        expect(dimensions()).toEqual(enabledDimensions)
        expect(StyleSheet.flatten(renderer.root.findByType('Label').props.style).color).toBe(
            '#777777'
        )
        expect(StyleSheet.flatten(renderer.root.findByType('AntDesign').props.style).color).toBe(
            '#777777'
        )
        act(() => renderer.unmount())
    }
)

test('icon buttons resolve families and use AntDesign for a shorthand sub-icon', () => {
    let renderer: any
    act(() => {
        renderer = create(
            <>
                <IconButton iconName={{ family: 'material', name: 'search' }} />
                <IconButton iconName={{ family: 'octicons', name: 'unmute', subIcon: 'close' }} />
            </>
        )
    })
    expect(renderer.root.findByType('MaterialIcon').props.name).toBe('search')
    expect(renderer.root.findByType('Octicon').props.name).toBe('unmute')
    expect(renderer.root.findByType('AntDesign').props.name).toBe('close')
    expect(renderer.root.findByType('AntDesign').props.size).toBe(12)
    act(() => renderer.unmount())
})
