import type { ReactNode } from 'react'
import {
    Pressable,
    View,
    type GestureResponderEvent,
    type PressableProps,
    type ViewProps,
} from 'react-native'

import IconButton from '@components/buttons/IconButton'
import ThemedButton, { type ThemedButtonProps } from '@components/buttons/ThemedButton'
import ThemedIcon, { type IconName } from '@components/icons/ThemedIcon'
import TText from '@components/text/TText'
import { Theme } from '@lib/theme/ThemeManager'

import FloatingPanel, { type FloatingPanelProps } from './FloatingPanel'

// Screen scopes are expressed by where stacks are mounted; feature state stays independent.
export const NoticeStack = ({ style, ...props }: ViewProps) => (
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
        ]}
    />
)

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
    return onPress ? (
        <Pressable
            onPress={onPress}
            accessibilityRole="button"
            accessibilityLabel={accessibilityLabel}
            style={{ maxWidth: '100%' }}>
            {panel}
        </Pressable>
    ) : (
        panel
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

export const CollapsedNotice = ({
    iconName,
    count,
    ...props
}: Omit<NoticeProps, 'label' | 'leading' | 'children' | 'actions'> & {
    iconName: IconName
    count: number
}) => {
    const { color } = Theme.useTheme()
    return (
        <Notice
            {...props}
            label={String(count)}
            leading={<ThemedIcon iconName={iconName} size={16} color={color.text._400} />}
        />
    )
}

export default Notice
