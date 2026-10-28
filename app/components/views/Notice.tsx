import AntDesign, { type AntDesignIconName } from '@react-native-vector-icons/ant-design/static'
import type { ReactNode } from 'react'
import { Pressable, View, type PressableProps, type ViewProps } from 'react-native'

import TText from '@components/text/TText'
import { Theme } from '@lib/theme/ThemeManager'
import { CHAT_CONTROL_EDGE, CHAT_CONTROL_GAP } from '@lib/constants/ChatControls'
import FloatingPanel, { type FloatingPanelProps } from './FloatingPanel'

// Screen scopes are expressed by where stacks are mounted; feature state stays independent.
export const NoticeStack = ({ style, ...props }: ViewProps) => (
    <View
        {...props}
        pointerEvents="box-none"
        style={[
            {
                position: 'absolute',
                top: CHAT_CONTROL_EDGE,
                right: CHAT_CONTROL_EDGE,
                maxWidth: '95%',
                zIndex: 150,
                alignItems: 'flex-end',
                rowGap: CHAT_CONTROL_GAP,
            },
            style,
        ]}
    />
)

type NoticeProps = FloatingPanelProps & {
    onPress?: PressableProps['onPress']
    accessibilityLabel?: string
    children?: ReactNode
}
const Notice = ({ onPress, accessibilityLabel, variant = 'neutral', ...props }: NoticeProps) => {
    const panel = <FloatingPanel {...props} variant={variant} />
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
export const CollapsedNotice = ({
    iconName,
    count,
    ...props
}: Omit<NoticeProps, 'children'> & { iconName: AntDesignIconName; count: number }) => {
    const { color } = Theme.useTheme()
    return (
        <Notice {...props} style={[{ columnGap: 8 }, props.style]}>
            <AntDesign name={iconName} size={16} color={color.text._400} />
            <TText>{count}</TText>
        </Notice>
    )
}
export default Notice
