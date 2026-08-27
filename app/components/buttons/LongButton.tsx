import { ReactNode } from 'react'
import { Pressable, ViewStyle } from 'react-native'
import Animated from 'react-native-reanimated'

import useAnimatedActiveColorStyle from '@lib/hooks/AnimatedActiveColorStyle'
import { Theme } from '@lib/theme/ThemeManager'

const AnimatedPressable = Animated.createAnimatedComponent(Pressable)

const LongButton: React.FC<{
    children?: ReactNode
    onPress?: () => void | Promise<void>
    active?: boolean
    style?: ViewStyle
}> = ({ children, onPress, active = true, style }) => {
    const { spacing, borderWidth, color } = Theme.useTheme()

    const animatedStyle = useAnimatedActiveColorStyle({
        deactiveColor: color.neutral._200,
        activeColor: color.primary._500,
        active: active,
    })

    return (
        <AnimatedPressable
            onPress={onPress}
            style={[
                {
                    borderWidth: borderWidth.m,
                    flexDirection: 'row',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    borderRadius: spacing.xl,
                    paddingLeft: spacing.xl,
                    paddingRight: spacing.xl,
                    paddingVertical: spacing.xl,
                },
                animatedStyle,
                style,
            ]}>
            {children}
        </AnimatedPressable>
    )
}

export default LongButton
