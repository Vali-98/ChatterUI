import AntDesign, { AntDesignIconName } from '@react-native-vector-icons/ant-design/static'
import MaterialIcons from '@react-native-vector-icons/material-icons/static'
import { ReactNode } from 'react'
import { PressableProps, TextStyle, ViewStyle } from 'react-native'
import { useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated'

import TText from '@components/text/TText'
import { AnimatedPressable } from '@lib/components/AnimatedComponents'
import { Theme } from '@lib/theme/ThemeManager'

type ButtonVariant = 'primary' | 'secondary' | 'tertiary' | 'critical' | 'disabled'

export interface ThemedButtonProps extends Omit<PressableProps, 'style'> {
    labelStyle?: TextStyle
    label?: string
    buttonStyle?: ViewStyle
    opacity?: number
    variant?: ButtonVariant
    iconName?: AntDesignIconName
    iconSize?: number
    iconStyle?: TextStyle
    icon?: ReactNode
}

type ButtonTheme = {
    buttonStyle: ViewStyle
    labelStyle: TextStyle
}

const useButtonTheme = (variant: ButtonVariant): ButtonTheme => {
    const theme = Theme.useTheme()
    //TODO:
    // Have a lightness checker to figure out whether or not to use light or dark text
    switch (variant) {
        default:
        case 'primary':
            return {
                buttonStyle: {
                    backgroundColor: theme.color.primary._500,
                    borderColor: theme.color.primary._200,
                    borderWidth: theme.borderWidth.m,
                    paddingVertical: theme.spacing.m,
                    paddingHorizontal: theme.spacing.xl,
                    borderRadius: theme.borderRadius.m,
                },
                labelStyle: {
                    textAlign: 'center',
                    color: theme.color.text._900,
                },
            }
        case 'secondary':
            return {
                buttonStyle: {
                    borderColor: theme.color.primary._400,
                    borderWidth: theme.borderWidth.m,
                    paddingVertical: theme.spacing.m,
                    paddingHorizontal: theme.spacing.xl,
                    borderRadius: theme.borderRadius.m,
                },
                labelStyle: {
                    textAlign: 'center',
                    color: theme.color.primary._700,
                },
            }
        case 'tertiary':
            return {
                buttonStyle: {
                    borderWidth: theme.borderWidth.m,
                    borderColor: 'rgba(0, 0, 0, 0)',
                },
                labelStyle: {
                    textAlign: 'center',
                    color: theme.color.text._200,
                },
            }
        case 'critical':
            return {
                buttonStyle: {
                    borderColor: theme.color.error._400,
                    borderWidth: theme.borderWidth.m,
                    paddingVertical: theme.spacing.m,
                    paddingHorizontal: theme.spacing.xl,
                    borderRadius: theme.borderRadius.m,
                },
                labelStyle: {
                    textAlign: 'center',
                    color: theme.color.error._400,
                },
            }
        case 'disabled':
            return {
                buttonStyle: {
                    borderColor: theme.color.neutral._500,
                    borderWidth: theme.borderWidth.m,
                    paddingVertical: theme.spacing.m,
                    paddingHorizontal: theme.spacing.xl,
                    borderRadius: theme.borderRadius.m,
                },
                labelStyle: {
                    textAlign: 'center',
                    color: theme.color.neutral._500,
                },
            }
    }
}

const ThemedButton: React.FC<ThemedButtonProps> = ({
    labelStyle,
    label,
    buttonStyle,
    children,
    onPressIn,
    opacity = 1,
    onPressOut,
    variant = 'primary',
    iconName = undefined,
    iconSize = 20,
    iconStyle = undefined,
    icon = undefined,
    ...rest
}) => {
    const animOpacity = useSharedValue(1)
    const theme = useButtonTheme(variant)
    const animatedStyle = useAnimatedStyle(() => {
        return {
            opacity: animOpacity.value,
        }
    })

    return (
        <AnimatedPressable
            disabled={variant === 'disabled'}
            onPressIn={(event) => {
                animOpacity.set(withTiming(0.4, { duration: 100 }))

                if (onPressIn) onPressIn(event)
            }}
            onPressOut={(event) => {
                animOpacity.set(withTiming(1, { duration: 100 }))
                if (onPressOut) onPressOut(event)
            }}
            {...rest}
            style={[
                animatedStyle,
                theme.buttonStyle,
                {
                    flexDirection: 'row',
                    columnGap: 8,
                    justifyContent: 'center',
                    alignItems: 'center',
                },
                buttonStyle,
            ]}>
            {!icon &&
                iconName &&
                (iconName !== 'search' ? (
                    <AntDesign
                        name={iconName}
                        size={iconSize}
                        style={iconStyle}
                        color={theme.labelStyle.color}
                    />
                ) : (
                    <MaterialIcons
                        name={'search'}
                        size={iconSize}
                        style={iconStyle}
                        color={theme.labelStyle.color}
                    />
                ))}
            {icon}
            {label && <TText style={[theme.labelStyle, labelStyle]}>{label}</TText>}
        </AnimatedPressable>
    )
}

export default ThemedButton
