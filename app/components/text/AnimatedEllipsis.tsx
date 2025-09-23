import { Octicons } from '@expo/vector-icons'
import { Theme } from '@lib/theme/ThemeManager'
import React, { useEffect, useMemo } from 'react'
import { View } from 'react-native'
import Animated, {
    useSharedValue,
    useAnimatedStyle,
    withRepeat,
    withSequence,
    withTiming,
    Easing,
    withDelay,
} from 'react-native-reanimated'

const translateMax = -8

type DotProps = {
    offset: number
}

const Dot: React.FC<DotProps> = ({ offset }) => {
    const { color } = Theme.useTheme()
    const progress = useSharedValue(0)

    progress.value = useMemo(
        () =>
            withDelay(
                offset,
                withRepeat(
                    withSequence(
                        withTiming(1, {
                            duration: 200,
                            easing: Easing.inOut(Easing.sin),
                        }),
                        withTiming(0, {
                            duration: 200,
                            easing: Easing.inOut(Easing.sin),
                        }),
                        withTiming(0, {
                            duration: 600,
                            easing: Easing.inOut(Easing.sin),
                        })
                    ),
                    -1,
                    false
                )
            ),
        []
    )

    const animatedStyle = useAnimatedStyle(() => {
        const translateY = progress.value * translateMax
        return {
            transform: [{ translateY }],
        }
    })

    return (
        <Animated.View style={animatedStyle}>
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
            <Dot offset={0} />
            <Dot offset={150} />
            <Dot offset={300} />
        </View>
    )
}

export default AnimatedEllipsis
