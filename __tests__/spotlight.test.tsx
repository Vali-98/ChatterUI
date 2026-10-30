import React, { act } from 'react'
import { View } from 'react-native'

import Spotlight from '../components/views/Spotlight'

let mockFrame: (frame: { timestamp: number }) => void
let mockActive = false
let mockBounds = { pageX: 20, pageY: 100, width: 300, height: 80 }
jest.mock('react-native-worklets', () => ({
    scheduleOnRN: (callback: (...args: unknown[]) => void, ...args: unknown[]) => callback(...args),
}))
jest.mock('expo-router', () => ({
    useFocusEffect: (effect: () => void) => require('react').useEffect(effect, [effect]),
}))
jest.mock('react-i18next', () => ({ useTranslation: () => ({ t: (key: string) => key }) }))
jest.mock('react-native-safe-area-context', () => ({
    useSafeAreaInsets: () => ({ top: 0, bottom: 0 }),
}))
jest.mock('../lib/theme/ThemeManager', () => ({
    Theme: {
        useTheme: () => ({ color: { primary: { _500: '#aaa' }, neutral: { _200: '#222' } } }),
    },
}))
jest.mock('../components/text/TText', () => ({
    __esModule: true,
    default: require('react-native').Text,
}))
jest.mock('../components/buttons/ThemedButton', () => ({
    __esModule: true,
    default: ({ label, onPress }: { label: string; onPress: () => void }) =>
        require('react').createElement(require('react-native').Pressable, {
            testID: label,
            onPress,
        }),
}))
jest.mock('../components/views/Portal', () => ({
    __esModule: true,
    default: ({ children }: { children: React.ReactNode }) =>
        require('react').createElement(
            require('react-native').View,
            { testID: 'spotlight-overlay' },
            children
        ),
}))
jest.mock('react-native-reanimated', () => ({
    __esModule: true,
    default: { View: require('react-native').View },
    useAnimatedRef: () => require('react').useRef(null),
    useSharedValue: (value: unknown) => require('react').useMemo(() => ({ value }), []),
    measure: () => mockBounds,
    useAnimatedStyle: (callback: () => unknown) => callback(),
    withTiming: (value: unknown) => value,
    Easing: { out: (value: unknown) => value, cubic: (value: number) => value },
    FadeIn: { duration: () => undefined },
    runOnJS: (callback: unknown) => callback,
    useFrameCallback: (callback: typeof mockFrame) => {
        mockFrame = callback
        return require('react').useMemo(
            () => ({
                setActive: (active: boolean) => {
                    mockActive = active
                },
            }),
            []
        )
    },
}))
beforeEach(() => {
    mockActive = false
})
const { create } = require('react-test-renderer')
Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true })
const frame = async (timestamp: number, y: number) =>
    act(async () => {
        mockBounds = { ...mockBounds, pageY: y }
        if (mockActive) mockFrame({ timestamp })
    })

test('waits for the final animated bounds; backdrop taps do not dismiss; Got it does', async () => {
    const dismiss = jest.fn()
    let screen: ReturnType<typeof create>
    await act(async () => {
        screen = create(
            <Spotlight visible description="Guide" onDismiss={dismiss} portalName="test">
                <View />
            </Spotlight>
        )
    })
    await frame(0, 100)
    await frame(120, 200)
    await frame(250, 300)
    await frame(400, 300)
    expect(screen.root.findAllByProps({ testID: 'spotlight-overlay' })).toHaveLength(0)
    await frame(460, 300)
    const backdropHandlers = new Set<() => void>(
        screen.root
            .findAll(
                (node: { props: { onPress?: () => void; testID?: string } }) =>
                    typeof node.props.onPress === 'function' &&
                    node.props.onPress !== dismiss &&
                    !node.props.testID
            )
            .map((node: { props: { onPress: () => void } }) => node.props.onPress)
    )
    expect(backdropHandlers.size).toBe(4)
    await act(async () => backdropHandlers.forEach((press) => press()))
    expect(dismiss).not.toHaveBeenCalled()
    await act(async () =>
        screen.root.findAllByProps({ testID: 'common.actions.gotIt' })[0].props.onPress()
    )
    expect(dismiss).toHaveBeenCalledTimes(1)
    await frame(500, 350)
    expect(screen.root.findAllByProps({ testID: 'spotlight-overlay' })).toHaveLength(0)
    await act(async () => screen.unmount())
    expect(mockActive).toBe(false)
})

test('ready gates delayed animations without consuming the spotlight', async () => {
    const dismiss = jest.fn()
    let screen: ReturnType<typeof create>
    const render = (ready: boolean) => (
        <Spotlight visible ready={ready} description="Guide" onDismiss={dismiss} portalName="test">
            <View />
        </Spotlight>
    )
    await act(async () => {
        screen = create(render(false))
    })
    expect(mockActive).toBe(false)
    await act(async () => screen.update(render(true)))
    await frame(0, 100)
    await frame(201, 100)
    expect(screen.root.findAllByProps({ testID: 'spotlight-overlay' }).length).toBeGreaterThan(0)
    expect(dismiss).not.toHaveBeenCalled()
    await act(async () => screen.unmount())
})

test('a multistep guide blocks the highlighted control even while its target is settling', async () => {
    let screen: ReturnType<typeof create>
    mockBounds = { pageX: 20, pageY: 100, width: 0, height: 0 }
    await act(async () => {
        screen = create(
            <Spotlight
                visible
                blockInteraction
                description="Guide"
                onDismiss={jest.fn()}
                portalName="blocked"
                controls={<View testID="guide-controls" />}>
                <View />
            </Spotlight>
        )
    })
    expect(screen.root.findAllByProps({ testID: 'guide-input-blocker' }).length).toBeGreaterThan(0)
    expect(screen.root.findAllByProps({ testID: 'guide-controls' }).length).toBeGreaterThan(0)
    mockBounds = { pageX: 20, pageY: 100, width: 300, height: 80 }
    await frame(0, 100)
    await frame(201, 100)
    expect(screen.root.findAllByProps({ testID: 'guide-input-blocker' }).length).toBeGreaterThan(0)
    await act(async () => screen.unmount())
})

test('a guide retains its overlay while the next target settles', async () => {
    let screen: ReturnType<typeof create>
    const first = { current: null } as never
    const second = { current: null } as never
    const render = (targetRef: typeof first, description: string) => (
        <Spotlight
            visible
            blockInteraction
            targetRef={targetRef}
            description={description}
            onDismiss={jest.fn()}
            portalName="persistent"
            controls={<View testID="guide-controls" />}
        />
    )
    await act(async () => {
        screen = create(render(first, 'First'))
    })
    await frame(0, 100)
    await frame(201, 100)
    await act(async () => screen.update(render(second, 'Second')))
    await frame(250, 500)
    expect(screen.root.findAllByProps({ testID: 'spotlight-overlay' }).length).toBeGreaterThan(0)
    expect(screen.root.findAllByProps({ testID: 'guide-input-blocker' }).length).toBeGreaterThan(0)
    await frame(451, 500)
    expect(screen.root.findAllByProps({ testID: 'spotlight-overlay' }).length).toBeGreaterThan(0)
    await act(async () => screen.unmount())
})

test('the bubble appears when native layout rounds its requested width', async () => {
    let screen: ReturnType<typeof create>
    const render = (description: string) => (
        <Spotlight visible description={description} onDismiss={jest.fn()} portalName="rounded" />
    )
    await act(async () => {
        screen = create(render('First'))
    })
    await frame(0, 100)
    await frame(201, 100)
    const content = screen.root.findAll(
        (node: { props: { onLayout?: unknown } }) => typeof node.props.onLayout === 'function'
    )[0]
    await act(async () => {
        content.props.onLayout({
            nativeEvent: { layout: { width: content.props.style.width - 0.1, height: 160 } },
        })
    })
    await act(async () => screen.update(render('Second')))
    const visibleBubble = screen.root.findAll((node: { props: { style?: unknown } }) => {
        const style = node.props.style
        return (
            Array.isArray(style) &&
            style.some((item) => item?.opacity === 1 && item?.height === 160)
        )
    })
    expect(visibleBubble.length).toBeGreaterThan(0)
    await act(async () => screen.unmount())
})
