import { Style } from '@lib/utils/Global'
import {
    Text,
    PressableProps,
    TextStyle,
    Pressable,
    ViewStyle,
    StyleSheet,
    Animated,
    useAnimatedValue,
} from 'react-native'

interface ButtonPrimaryProps extends Omit<PressableProps, 'style'> {
    labelStyle?: TextStyle
    label?: string
    buttonStyle?: ViewStyle
    opacity?: number
}

const AnimatedPressable = Animated.createAnimatedComponent(Pressable)

const ButtonPrimary: React.FC<ButtonPrimaryProps> = ({
    labelStyle,
    label,
    buttonStyle,
    children,
    onPressIn,
    opacity = 1,
    onPressOut,
    ...rest
}) => {
    const animOpacity = useAnimatedValue(1)

    const handlePressIn = () => {
        animOpacity.setValue(0.4)
    }

    const handlePressOut = () => {
        Animated.timing(animOpacity, {
            toValue: 1,
            duration: 50,
            useNativeDriver: true,
        }).start()
    }

    return (
        <AnimatedPressable
            onPressIn={(event) => {
                handlePressIn()
                if (onPressIn) onPressIn(event)
            }}
            onPressOut={(event) => {
                handlePressOut()
                if (onPressOut) onPressOut(event)
            }}
            {...rest}
            style={StyleSheet.flatten([
                buttonStyle,
                {
                    backgroundColor: Style.getColor('primary-brand'),
                    padding: 8,
                    borderRadius: 8,
                    opacity: animOpacity,
                    transform: [{ scaleX: 0.99 }],
                },
            ])}>
            {label && <Text style={[labelStyle, { textAlign: 'center' }]}>{label}</Text>}
        </AnimatedPressable>
    )
}

export default ButtonPrimary
