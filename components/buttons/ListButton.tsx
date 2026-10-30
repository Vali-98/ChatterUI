import { type PressableProps, type StyleProp, type ViewStyle } from 'react-native'

import { type ListCardAppearance, useListCardStyle } from '@components/views/ListCard'
import { AnimatedPressable } from '@lib/components/AnimatedComponents'
import { Theme } from '@lib/theme/ThemeManager'

export type ListButtonProps = Omit<PressableProps, 'style'> &
    ListCardAppearance & {
        style?: StyleProp<ViewStyle>
    }

const ListButton = ({
    active,
    warning,
    disabled = false,
    style,
    accessibilityState,
    ...props
}: ListButtonProps) => {
    const cardStyle = useListCardStyle({ active, warning })
    const { color } = Theme.useTheme()
    return (
        <AnimatedPressable
            accessibilityRole="button"
            {...props}
            disabled={disabled}
            accessibilityState={{ ...accessibilityState, disabled: !!disabled }}
            style={[
                cardStyle,
                disabled && { borderColor: color.neutral._500, opacity: 0.5 },
                style,
            ]}
        />
    )
}

export default ListButton
