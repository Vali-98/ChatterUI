import {
    StyleSheet,
    type PressableProps,
    type StyleProp,
    type TextStyle,
    type ViewStyle,
} from 'react-native'
import { useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated'

import ThemedIcon, { type IconName } from '@components/icons/ThemedIcon'
import TText from '@components/text/TText'
import { AnimatedPressable } from '@lib/components/AnimatedComponents'
import { getContrastingColor } from '@lib/theme/contrast'
import { Theme } from '@lib/theme/ThemeManager'

export type ButtonVariant = 'primary' | 'secondary' | 'tertiary'
export type ButtonLevel = 'neutral' | 'muted' | 'primary' | 'warning' | 'error'

export interface ButtonAppearanceProps extends Omit<PressableProps, 'style' | 'children'> {
    variant?: ButtonVariant
    level?: ButtonLevel
    viewStyle?: StyleProp<ViewStyle>
    iconSize?: number
    iconStyle?: StyleProp<TextStyle>
}

const ButtonBase = ({
    variant,
    level = 'neutral',
    disabled = false,
    viewStyle,
    iconName,
    iconSize,
    iconStyle,
    label,
    labelStyle,
    onPressIn,
    onPressOut,
    accessibilityState,
    ...props
}: ButtonAppearanceProps & {
    variant: ButtonVariant
    iconName?: IconName
    iconSize: number
    label?: string
    labelStyle?: StyleProp<TextStyle>
}) => {
    const { color, borderWidth, borderRadius, spacing } = Theme.useTheme()
    const palette = level === 'neutral' || level === 'muted' ? color.neutral : color[level]
    const fill =
        level === 'muted' ? palette._200 : level === 'neutral' ? palette._300 : palette._500
    const foreground =
        level === 'muted'
            ? color.text._400
            : variant === 'primary'
              ? getContrastingColor(fill)
              : level === 'neutral'
                ? color.text._200
                : level === 'error'
                  ? palette._400
                  : palette._700
    const disabledColor = color.text._500
    const animOpacity = useSharedValue(1)
    const animatedStyle = useAnimatedStyle(() => ({ opacity: disabled ? 1 : animOpacity.value }))
    const disabledStyle: ViewStyle | undefined = disabled
        ? {
              borderColor: variant === 'tertiary' ? 'transparent' : color.neutral._400,
              backgroundColor: variant === 'primary' ? color.neutral._200 : 'transparent',
          }
        : undefined
    const background =
        StyleSheet.flatten(viewStyle)?.backgroundColor ??
        (variant === 'primary' ? fill : color.neutral._100)
    return (
        <AnimatedPressable
            accessibilityRole="button"
            {...props}
            disabled={disabled}
            accessibilityState={{ ...accessibilityState, disabled: !!disabled }}
            onPressIn={(event) => {
                animOpacity.set(withTiming(0.4, { duration: 100 }))
                onPressIn?.(event)
            }}
            onPressOut={(event) => {
                animOpacity.set(withTiming(1, { duration: 100 }))
                onPressOut?.(event)
            }}
            style={[
                {
                    flexDirection: 'row',
                    columnGap: 8,
                    justifyContent: 'center',
                    alignItems: 'center',
                    borderRadius: borderRadius.m,
                    borderWidth: variant === 'tertiary' ? 0 : borderWidth.m,
                    borderColor:
                        variant === 'tertiary'
                            ? 'transparent'
                            : level === 'muted'
                              ? palette._300
                              : palette._400,
                    backgroundColor: variant === 'primary' ? fill : 'transparent',
                    paddingHorizontal: label === undefined ? 4 : spacing.xl,
                    paddingVertical: label === undefined ? 4 : spacing.m,
                },
                viewStyle,
                disabledStyle,
                animatedStyle,
            ]}>
            {iconName && (
                <ThemedIcon
                    iconName={iconName}
                    size={iconSize}
                    color={disabled ? disabledColor : foreground}
                    backgroundColor={
                        disabledStyle?.backgroundColor === 'transparent'
                            ? color.neutral._100
                            : (disabledStyle?.backgroundColor ?? background)
                    }
                    style={[iconStyle, disabled && { color: disabledColor }]}
                />
            )}
            {label !== undefined && (
                <TText
                    style={[
                        { textAlign: 'center', color: foreground },
                        labelStyle,
                        disabled && { color: disabledColor },
                    ]}>
                    {label}
                </TText>
            )}
        </AnimatedPressable>
    )
}

export default ButtonBase
