import { ReactNode } from 'react'
import { View, ViewStyle } from 'react-native'

import { AnimatedPressable } from '@lib/components/AnimatedComponents'
import useAnimatedActiveColorStyle from '@lib/hooks/AnimatedActiveColorStyle'
import { Theme } from '@lib/theme/ThemeManager'

const ListButtonSection: React.FC<{
    children?: ReactNode
    style?: ViewStyle
}> = ({ children, style }) => {
    return (
        <View
            style={[
                {
                    flexDirection: 'row',
                    alignItems: 'center',
                    alignSelf: 'stretch',
                    flexShrink: 1,
                },
                style,
            ]}>
            {children}
        </View>
    )
}

const ListButton: React.FC<{
    children?: ReactNode
    onPress?: () => void | Promise<void>
    active?: boolean
    warning?: boolean
    style?: ViewStyle
}> = ({ children, onPress, active = true, warning = false, style }) => {
    const { spacing, borderWidth, color } = Theme.useTheme()

    const animatedStyle = useAnimatedActiveColorStyle({
        deactiveColor: warning ? color.warning : color.neutral._200,
        activeColor: warning ? color.warning : color.primary._500,
        active: active,
    })

    return (
        <AnimatedPressable
            onPress={onPress}
            style={[
                {
                    borderWidth: borderWidth.m,
                    flexDirection: 'row',
                    alignItems: 'stretch',
                    justifyContent: 'space-between',
                    borderRadius: spacing.xl,
                },
                animatedStyle,
                style,
            ]}>
            {children}
        </AnimatedPressable>
    )
}

export { ListButtonSection }
export default ListButton
