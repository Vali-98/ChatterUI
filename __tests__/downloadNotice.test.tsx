import { act } from 'react'
import { View } from 'react-native'

import IconButton from '../components/buttons/IconButton'
import DownloadNotice from '../components/downloads/DownloadNotice'
import CharacterImportNotice from '../components/views/CharacterImportNotice'
import Notice from '../components/views/Notice'
import ActivityMenu from '../components/views/ActivityMenu'
import { useCharacterImportState } from '../lib/state/characters/importState'

const mockPush = jest.fn()
let mockOnboarding = 'complete'
let mockDownloads = [{ id: 'one', status: 'downloading', bytesWritten: 50, totalBytes: 100 }]
jest.mock('expo-router', () => ({
    useIsFocused: () => true,
    useFocusEffect: (effect: () => void) => require('react').useEffect(effect, [effect]),
    router: { push: (...args: unknown[]) => mockPush(...args) },
}))
jest.mock('../lib/animations/transitions', () => ({ ExpandHeightIn: {}, ShrinkHeightOut: {} }))
jest.mock('../components/views/Portal', () => ({
    __esModule: true,
    default: ({ children }: { children: import('react').ReactNode }) => children,
}))
jest.mock('react-i18next', () => ({ useTranslation: () => ({ t: (key: string) => key }) }))
jest.mock('react-native-reanimated', () => {
    const transition = { duration: () => transition }
    return {
        __esModule: true,
        default: { View: require('react-native').View },
        FadeIn: transition,
        FadeOut: transition,
        LinearTransition: transition,
    }
})
jest.mock('../lib/downloads/store', () => ({
    useDownloadStore: (selector: (state: unknown) => unknown) =>
        selector({ downloads: mockDownloads }),
}))
jest.mock('../lib/onboarding/store', () => ({
    useOnboardingStore: (selector: (state: unknown) => unknown) =>
        selector({ status: mockOnboarding }),
}))
jest.mock('../lib/theme/ThemeManager', () => ({
    Theme: {
        useTheme: () => ({
            color: {
                neutral: { _100: '#111111', _300: '#333333', _500: '#555555' },
                primary: { _400: '#0088ff', _500: '#0077ff' },
                error: { _400: '#ff0000' },
                text: { _400: '#aaaaaa' },
                warning: { _500: '#ffff00' },
                shadow: { color: '#000000', opacity: 1 },
            },
        }),
    },
}))
jest.mock('@react-native-vector-icons/ant-design/static', () => ({
    __esModule: true,
    default: () =>
        require('react').createElement(require('react-native').View, { testID: 'download-icon' }),
}))
jest.mock('../components/text/TText', () => ({
    __esModule: true,
    default: require('react-native').Text,
}))
jest.mock('../components/buttons/IconButton', () =>
    jest.requireMock('../components/buttons/ThemedButton')
)
jest.mock('../components/buttons/ThemedButton', () => ({
    __esModule: true,
    default: (props: object) =>
        require('react').createElement(require('react-native').Pressable, props),
}))
jest.mock('../components/views/ProgressBar', () => ({
    __esModule: true,
    default: ({ progress }: { progress: number }) =>
        require('react').createElement(require('react-native').View, {
            testID: 'progress',
            progress,
        }),
}))

const { create } = require('react-test-renderer')
Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true })
beforeEach(() => {
    mockOnboarding = 'complete'
    mockDownloads = [{ id: 'one', status: 'downloading', bytesWritten: 50, totalBytes: 100 }]
    mockPush.mockClear()
})

test('the bell opens activity without navigating, groups chat first and reflects severity', async () => {
    let screen: ReturnType<typeof create>
    await act(async () => {
        screen = create(
            <ActivityMenu>
                <DownloadNotice />
                <Notice scope="chat" label="Unfinished summary" variant="warning" />
            </ActivityMenu>
        )
    })
    const badge = screen.root
        .findAllByType(View)
        .find((view: any) => view.props.style?.backgroundColor === '#ffff00')
    expect(badge).toBeDefined()
    await act(async () => screen.root.findByType(IconButton).props.onPress())
    expect(mockPush).not.toHaveBeenCalled()
    const texts = screen.root
        .findAllByType(require('react-native').Text)
        .map((text: any) => text.props.children)
    expect(texts.indexOf('Unfinished summary')).toBeLessThan(
        texts.findIndex(
            (text: unknown) => typeof text === 'string' && text.startsWith('downloads.badge')
        )
    )
    expect(screen.root.findAllByProps({ testID: 'progress' })[0].props.progress).toBe(50)
    await act(async () =>
        screen.root.findAllByProps({ accessibilityRole: 'button' })[0].props.onPress({})
    )
    expect(mockPush).toHaveBeenCalledWith('/models')
    expect(screen.root.findAllByProps({ testID: 'activity-panel' })).toHaveLength(0)
    await act(async () => screen.unmount())
})

test('a task preview expires and progress updates or navigation do not announce it again', async () => {
    jest.useFakeTimers()
    mockDownloads = []
    let screen: ReturnType<typeof create>
    try {
        await act(async () => {
            screen = create(
                <ActivityMenu>
                    <DownloadNotice />
                </ActivityMenu>
            )
        })
        mockDownloads = [
            { id: 'preview-test', status: 'downloading', bytesWritten: 50, totalBytes: 100 },
        ]
        await act(async () =>
            screen.update(
                <ActivityMenu>
                    <DownloadNotice />
                </ActivityMenu>
            )
        )
        expect(screen.root.findAllByProps({ testID: 'activity-preview' }).length).toBeGreaterThan(0)
        await act(async () => jest.advanceTimersByTime(2500))
        mockDownloads = [{ ...mockDownloads[0], bytesWritten: 75 }]
        await act(async () =>
            screen.update(
                <ActivityMenu>
                    <DownloadNotice />
                </ActivityMenu>
            )
        )
        await act(async () => jest.advanceTimersByTime(500))
        expect(screen.root.findAllByProps({ testID: 'activity-preview' })).toHaveLength(0)
        mockDownloads = [
            ...mockDownloads,
            { id: 'second', status: 'downloading', bytesWritten: 30, totalBytes: 100 },
            { id: 'latest', status: 'downloading', bytesWritten: 10, totalBytes: 100 },
        ]
        await act(async () =>
            screen.update(
                <ActivityMenu>
                    <DownloadNotice />
                </ActivityMenu>
            )
        )
        const preview = screen.root.findAllByProps({ testID: 'activity-preview' })[0]
        expect(preview.findAllByProps({ testID: 'progress' })[0].props.progress).toBe(10)
        await act(async () => screen.unmount())
        await act(async () => {
            screen = create(
                <ActivityMenu>
                    <DownloadNotice />
                </ActivityMenu>
            )
        })
        expect(screen.root.findAllByProps({ testID: 'activity-preview' })).toHaveLength(0)
    } finally {
        await act(async () => screen?.unmount())
        jest.useRealTimers()
    }
})

test('character import results dismiss automatically, including while the activity panel is closed', async () => {
    jest.useFakeTimers()
    let screen: ReturnType<typeof create>
    try {
        useCharacterImportState.setState({
            isImporting: true,
            total: 2,
            completed: 0,
            succeeded: 0,
            failed: 0,
            noticeDismissed: false,
        })
        await act(async () => {
            screen = create(
                <ActivityMenu>
                    <CharacterImportNotice />
                </ActivityMenu>
            )
        })
        await act(async () => jest.advanceTimersByTime(10_000))
        expect(useCharacterImportState.getState().noticeDismissed).toBe(false)
        await act(async () => {
            useCharacterImportState.setState({ isImporting: false, completed: 2, succeeded: 2 })
        })
        await act(async () => jest.advanceTimersByTime(4999))
        expect(useCharacterImportState.getState().noticeDismissed).toBe(false)
        await act(async () => jest.advanceTimersByTime(1))
        expect(useCharacterImportState.getState().noticeDismissed).toBe(true)
        expect(screen.root.findAllByType(IconButton)).toHaveLength(1)
    } finally {
        await act(async () => screen?.unmount())
        jest.useRealTimers()
    }
})

test('onboarding and completed transfers do not show a notice', async () => {
    let screen: ReturnType<typeof create>
    mockOnboarding = 'inProgress'
    await act(async () => {
        screen = create(<DownloadNotice />)
    })
    expect(screen.root.findAllByType(View)).toHaveLength(0)
    mockOnboarding = 'complete'
    mockDownloads = [{ id: 'one', status: 'completed', bytesWritten: 100, totalBytes: 100 }]
    await act(async () => screen.update(<DownloadNotice />))
    expect(screen.root.findAllByType(View)).toHaveLength(0)
    await act(async () => screen.unmount())
})
