import { Octicons } from '@expo/vector-icons'
import { Theme } from '@lib/theme/ThemeManager'
import { useEffect } from 'react'
import { View, Animated, Easing, useAnimatedValue } from 'react-native'

const translateMax = -10

type DotProps = {
    offset: number
}

const Dot: React.FC<DotProps> = ({ offset }) => {
    const animatedValue = useAnimatedValue(0)

    useEffect(() => {
        Animated.loop(
            Animated.sequence([
                Animated.timing(animatedValue, {
                    toValue: 0,
                    duration: 400 + offset,
                    easing: Easing.inOut(Easing.sin),
                    useNativeDriver: true,
                }),
                Animated.timing(animatedValue, {
                    toValue: 1,
                    duration: 200,
                    easing: Easing.inOut(Easing.sin),
                    useNativeDriver: true,
                }),
                Animated.timing(animatedValue, {
                    toValue: 0,
                    duration: 200,
                    easing: Easing.inOut(Easing.sin),
                    useNativeDriver: true,
                }),
                Animated.timing(animatedValue, {
                    toValue: 0,
                    duration: 400 - offset,
                    easing: Easing.inOut(Easing.sin),
                    useNativeDriver: true,
                }),
            ])
        ).start()
    }, [])

    const translateY = animatedValue.interpolate({
        inputRange: [0, 1],
        outputRange: [0, translateMax],
    })

    const { color } = Theme.useTheme()

    return (
        <Animated.View style={{ transform: [{ translateY }] }}>
            <Octicons name="dot-fill" size={5} color={color.text._200} />
        </Animated.View>
    )
}

const AnimatedEllipsis = () => {
    return (
        <View
            style={{
                flexDirection: 'row',
                paddingTop: 12,
                paddingBottom: 8,
                paddingHorizontal: 4,
                columnGap: 8,
            }}>
            <Dot offset={100} />
            <Dot offset={200} />
            <Dot offset={300} />
        </View>
    )
}

export default AnimatedEllipsis
