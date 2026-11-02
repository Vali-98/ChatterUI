import {
    createContext,
    useCallback,
    useContext,
    useEffect,
    useId,
    useLayoutEffect,
    useMemo,
    useState,
    type ReactNode,
} from 'react'
import { useTranslation } from 'react-i18next'
import {
    Pressable,
    View,
    type GestureResponderEvent,
    type PressableProps,
    type ViewProps,
} from 'react-native'
import Animated, { FadeIn, FadeOut, LinearTransition } from 'react-native-reanimated'

import IconButton from '@components/buttons/IconButton'
import ThemedButton, { type ThemedButtonProps } from '@components/buttons/ThemedButton'
import type { IconName } from '@components/icons/ThemedIcon'
import TText from '@components/text/TText'

import FloatingPanel, { type FloatingPanelProps } from './FloatingPanel'

const NoticeStackContext = createContext<{
    collapsed: boolean
    register: (id: string) => () => void
} | null>(null)

// Notice components register only while they have something to show. They stay mounted when
// collapsed so progress, cancellation and automatic dismissal retain their normal lifetimes.
export const NoticeStack = ({ style, children, ...props }: ViewProps) => {
    const { t } = useTranslation()
    const [noticeIds, setNoticeIds] = useState(() => new Set<string>())
    const [collapsed, setCollapsed] = useState(false)
    const register = useCallback((id: string) => {
        setNoticeIds((previous) => new Set(previous).add(id))
        return () => {
            setNoticeIds((previous) => {
                const next = new Set(previous)
                next.delete(id)
                return next
            })
        }
    }, [])
    const context = useMemo(() => ({ collapsed, register }), [collapsed, register])
    useEffect(() => {
        if (noticeIds.size === 0) setCollapsed(false)
    }, [noticeIds.size])

    return (
        <NoticeStackContext.Provider value={context}>
            <View
                {...props}
                pointerEvents="box-none"
                style={[
                    {
                        position: 'absolute',
                        top: 12,
                        right: 12,
                        maxWidth: '95%',
                        zIndex: 150,
                        alignItems: 'flex-end',
                        rowGap: 8,
                    },
                    style,
                ]}>
                {noticeIds.size > 0 && (
                    <Animated.View entering={FadeIn.duration(150)} exiting={FadeOut.duration(150)}>
                        <FloatingPanel
                            variant="neutral"
                            style={{ paddingHorizontal: 0, paddingVertical: 0 }}>
                            <IconButton
                                iconName={collapsed ? 'down' : 'close'}
                                iconSize={18}
                                level="muted"
                                accessibilityLabel={t(
                                    collapsed ? 'common.actions.expand' : 'common.actions.collapse'
                                )}
                                onPress={() => setCollapsed((previous) => !previous)}
                            />
                        </FloatingPanel>
                    </Animated.View>
                )}
                {children}
            </View>
        </NoticeStackContext.Provider>
    )
}

export type NoticeProps = Omit<FloatingPanelProps, 'children'> & {
    label: string
    leading?: ReactNode
    actions?: ReactNode
    children?: ReactNode
    onPress?: PressableProps['onPress']
    accessibilityLabel?: string
}

const Notice = ({
    label,
    leading,
    actions,
    children,
    onPress,
    accessibilityLabel,
    variant = 'neutral',
    style,
    ...props
}: NoticeProps) => {
    const stack = useContext(NoticeStackContext)
    const register = stack?.register
    const id = useId()
    useLayoutEffect(() => register?.(id), [register, id])
    if (stack?.collapsed) return null

    const panel = (
        <FloatingPanel
            {...props}
            variant={variant}
            style={[{ flexDirection: 'column', alignItems: 'stretch', rowGap: 6 }, style]}>
            <View
                style={{ flexDirection: 'row', alignItems: 'center', columnGap: 8, minHeight: 24 }}>
                {leading}
                <TText numberOfLines={1}>{label}</TText>
                {actions && (
                    <View style={{ flexDirection: 'row', alignItems: 'center', columnGap: 4 }}>
                        {actions}
                    </View>
                )}
            </View>
            {children}
        </FloatingPanel>
    )
    return (
        <Animated.View
            collapsable={false}
            entering={FadeIn.duration(150)}
            exiting={FadeOut.duration(150)}
            layout={LinearTransition.duration(150)}
            style={{ maxWidth: '100%' }}>
            {onPress ? (
                <Pressable
                    onPress={onPress}
                    accessibilityRole="button"
                    accessibilityLabel={accessibilityLabel}>
                    {panel}
                </Pressable>
            ) : (
                panel
            )}
        </Animated.View>
    )
}

type NoticeActionProps = Omit<ThemedButtonProps, 'label' | 'variant' | 'iconName'> &
    ({ label: string; iconName?: IconName } | { label?: undefined; iconName: IconName })
export const NoticeAction = ({
    label,
    onPress,
    viewStyle,
    level = 'muted',
    iconSize = 16,
    ...props
}: NoticeActionProps) => {
    const common = {
        ...props,
        level,
        iconSize,
        variant: 'tertiary' as const,
        viewStyle: [{ paddingHorizontal: 4, paddingVertical: 4 }, viewStyle],
        onPress: (event: GestureResponderEvent) => {
            event.stopPropagation()
            onPress?.(event)
        },
    }
    return label === undefined ? (
        <IconButton {...common} iconName={props.iconName!} />
    ) : (
        <ThemedButton {...common} label={label} />
    )
}

export default Notice
