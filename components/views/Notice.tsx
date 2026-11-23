import { useContext, useId, useLayoutEffect, type ReactNode } from 'react'
import { useTranslation } from 'react-i18next'
import { Pressable, View, type GestureResponderEvent, type PressableProps } from 'react-native'
import Animated, { FadeIn, FadeOut, LinearTransition } from 'react-native-reanimated'

import IconButton from '@components/buttons/IconButton'
import ThemedButton, { type ThemedButtonProps } from '@components/buttons/ThemedButton'
import type { IconName } from '@components/icons/ThemedIcon'
import TText from '@components/text/TText'
import { Theme } from '@lib/theme/ThemeManager'

import { ActivityContext } from './ActivityMenu'

import FloatingPanel, { getFloatingPanelColor, type FloatingPanelProps } from './FloatingPanel'

export type NoticeProps = Omit<FloatingPanelProps, 'children'> & {
    label: string
    scope?: 'chat' | 'app'
    previewKey?: string
    progress?: number
    leading?: ReactNode
    actions?: ReactNode
    children?: ReactNode
    onPress?: PressableProps['onPress']
    accessibilityLabel?: string
}

const Notice = ({
    label,
    scope = 'app',
    previewKey,
    progress,
    leading,
    actions,
    children,
    onPress,
    accessibilityLabel,
    variant = 'neutral',
    style,
    ...props
}: NoticeProps) => {
    const { color } = Theme.useTheme()
    const activity = useContext(ActivityContext)
    const id = useId()
    const update = activity?.update
    const remove = activity?.remove
    const close = activity?.close

    const Panel = activity ? View : FloatingPanel
    const panel = (
        <Panel
            {...props}
            {...(!activity && { variant })}
            style={[
                { flexDirection: 'column', alignItems: 'stretch', rowGap: 8 },
                activity && {
                    paddingHorizontal: 12,
                    paddingVertical: 12,
                    borderLeftWidth: 2,
                    borderLeftColor:
                        variant === 'neutral'
                            ? 'transparent'
                            : getFloatingPanelColor(color, variant),
                },
                style,
            ]}>
            <View
                style={{ flexDirection: 'row', alignItems: 'center', columnGap: 8, minHeight: 24 }}>
                {leading}
                <TText color="300" numberOfLines={1}>
                    {label}
                </TText>
                {actions && (
                    <View style={{ flexDirection: 'row', alignItems: 'center', columnGap: 4 }}>
                        {actions}
                    </View>
                )}
            </View>
            {children}
        </Panel>
    )
    const content = (
        <Animated.View
            collapsable={false}
            entering={activity ? undefined : FadeIn.duration(150)}
            exiting={activity ? undefined : FadeOut.duration(150)}
            layout={LinearTransition.duration(150)}
            style={{ maxWidth: '100%' }}>
            {onPress ? (
                <Pressable
                    onPress={(event) => {
                        close?.()
                        onPress(event)
                    }}
                    accessibilityRole="button"
                    accessibilityLabel={accessibilityLabel}>
                    {panel}
                </Pressable>
            ) : (
                panel
            )}
        </Animated.View>
    )
    useLayoutEffect(() => {
        update?.(id, { label, variant, scope, previewKey, progress, content })
    }, [update, id, label, variant, scope, previewKey, progress, content])
    useLayoutEffect(() => () => remove?.(id), [remove, id])
    return activity ? null : content
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
