import { act } from 'react'

import ChatNotices from '../screens/ChatScreen/ChatNotices'

const mockOpen = jest.fn()
const mockRestore = jest.fn((id: number) => {
    mockSummaries = mockSummaries.map((summary) =>
        summary.id === id ? { ...summary, notice_dismissed: false } : summary
    )
})
let mockSummaries = [
    {
        id: 1,
        status: 'draft',
        notice_dismissed: true,
        source_changed: false,
        error: { reason: 'failed' },
    },
    { id: 2, status: 'accepted', notice_dismissed: true, source_changed: true, error: null },
]
jest.mock('react-i18next', () => ({ useTranslation: () => ({ t: (key: string) => key }) }))
jest.mock('../lib/theme/ThemeManager', () => ({
    Theme: { useTheme: () => ({ color: { text: { _400: '#aaa' }, error: { _400: '#f00' } } }) },
}))
jest.mock('../lib/engine/generation/hooks', () => ({ useDeferredTasks: () => [] }))
jest.mock('../lib/engine/generation/scheduler', () => ({ cancelDeferredTask: jest.fn() }))
jest.mock('../lib/engine/summaries/actions', () => ({
    dismissSummaryNotice: jest.fn(),
    restoreSummaryNotice: (id: number) => mockRestore(id),
}))
jest.mock('../lib/hooks/liveQuery', () => ({ useLiveQuerySync: () => ({ data: mockSummaries }) }))
jest.mock('../lib/summaries/db', () => ({ summaryList: () => null }))
jest.mock('../lib/summaries/panelState', () => ({
    useSummaryPanelState: (selector: (state: unknown) => unknown) => selector({ open: mockOpen }),
}))
jest.mock('../lib/summaries/settingsStore', () => ({
    useSummarySettingsStore: (selector: (state: unknown) => unknown) =>
        selector({ warnOnSourceChanges: true }),
}))
jest.mock('../components/views/Notice', () => ({
    __esModule: true,
    default: (props: object) =>
        require('react').createElement(require('react-native').View, {
            ...props,
            testID: 'notice',
        }),
    CollapsedNotice: (props: object) =>
        require('react').createElement(require('react-native').View, {
            ...props,
            testID: 'collapsed',
        }),
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
    default: require('react-native').Pressable,
}))
jest.mock('../components/views/ThemedSpinner', () => ({
    __esModule: true,
    default: require('react-native').View,
}))
const { create } = require('react-test-renderer')
Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true })

test('a collapsed summary group retains error severity and expands without opening the editor', async () => {
    let screen: ReturnType<typeof create>
    await act(async () => {
        screen = create(<ChatNotices chatId={7} />)
    })
    const collapsed = screen.root.findAllByProps({ testID: 'collapsed' })[0]
    expect(collapsed.props.variant).toBe('error')
    expect(collapsed.props.count).toBe(2)
    await act(async () => collapsed.props.onPress())
    expect(mockRestore).toHaveBeenCalledWith(1)
    expect(mockRestore).toHaveBeenCalledWith(2)
    expect(mockOpen).not.toHaveBeenCalled()
    await act(async () => screen.update(<ChatNotices chatId={7} />))
    expect(screen.root.findAllByProps({ testID: 'collapsed' })).toHaveLength(0)
    const notices = screen.root
        .findAllByProps({ testID: 'notice' })
        .filter((node: { type: unknown }) => typeof node.type === 'string')
    expect(notices.map((notice: { props: { variant: string } }) => notice.props.variant)).toEqual([
        'error',
        'warning',
    ])
    await act(async () => notices[0].props.onPress())
    expect(mockOpen).toHaveBeenCalledWith(7, 1)
    await act(async () => screen.unmount())
})
