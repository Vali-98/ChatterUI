import Octicons from '@react-native-vector-icons/octicons/static'
import React, { useMemo } from 'react'
import { View } from 'react-native'
import Animated, {
    Easing,
    useAnimatedStyle,
    useSharedValue,
    withDelay,
    withRepeat,
    withSequence,
    withTiming,
} from 'react-native-reanimated'

import { Theme } from '@lib/theme/ThemeManager'

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
        [offset]
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
