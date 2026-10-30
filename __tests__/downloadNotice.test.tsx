import { act } from 'react'
import { View } from 'react-native'

import DownloadNotice from '../components/downloads/DownloadNotice'
import { useDownloadNoticeState } from '../lib/downloads/noticeState'

const mockPush = jest.fn()
let mockOnboarding = 'complete'
let mockDownloads = [{ id: 'one', status: 'downloading', bytesWritten: 50, totalBytes: 100 }]
jest.mock('expo-router', () => ({ router: { push: (...args: unknown[]) => mockPush(...args) } }))
jest.mock('react-i18next', () => ({ useTranslation: () => ({ t: (key: string) => key }) }))
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
jest.mock('../components/downloads/DownloadItem', () => ({
    DownloadProgress: ({ progress }: { progress: number }) =>
        require('react').createElement(require('react-native').View, {
            testID: 'progress',
            progress,
        }),
}))

const { create } = require('react-test-renderer')
Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true })
beforeEach(() => {
    useDownloadNoticeState.getState().expand()
    mockOnboarding = 'complete'
    mockDownloads = [{ id: 'one', status: 'downloading', bytesWritten: 50, totalBytes: 100 }]
    mockPush.mockClear()
})

test('collapsed downloads stay compact across hosts and expand before navigation', async () => {
    let screen: ReturnType<typeof create>
    await act(async () => {
        screen = create(<DownloadNotice />)
    })
    const event = { stopPropagation: jest.fn() }
    await act(async () => {
        screen.root
            .findAllByProps({ accessibilityLabel: 'common.actions.collapse' })[0]
            .props.onPress(event)
    })
    expect(event.stopPropagation).toHaveBeenCalled()
    expect(mockPush).not.toHaveBeenCalled()
    expect(screen.root.findAllByProps({ testID: 'download-icon' }).length).toBeGreaterThan(0)
    expect(screen.root.findAllByProps({ testID: 'progress' })).toHaveLength(0)
    await act(async () => screen.unmount())
    await act(async () => {
        screen = create(<DownloadNotice />)
    })
    expect(screen.root.findAllByProps({ testID: 'download-icon' }).length).toBeGreaterThan(0)
    await act(async () =>
        screen.root.findAllByProps({ accessibilityRole: 'button' })[0].props.onPress()
    )
    expect(mockPush).not.toHaveBeenCalled()
    expect(screen.root.findAllByProps({ testID: 'progress' })[0].props.progress).toBe(50)
    await act(async () =>
        screen.root.findAllByProps({ accessibilityRole: 'button' })[0].props.onPress()
    )
    expect(mockPush).toHaveBeenCalledWith('/screens/ModelManagerScreen')
    expect(useDownloadNoticeState.getState().collapsedFor).toBeUndefined()
    expect(
        screen.root.findAllByProps({ accessibilityLabel: 'common.actions.collapse' }).length
    ).toBeGreaterThan(0)
    await act(async () => screen.unmount())
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
