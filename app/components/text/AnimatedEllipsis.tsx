import { Octicons } from '@expo/vector-icons'
import { Style } from '@lib/utils/Global'
import { useEffect } from 'react'
import { View } from 'react-native'
import Animated, {
    SharedValue,
    useAnimatedStyle,
    useSharedValue,
    withRepeat,
    withTiming,
} from 'react-native-reanimated'

const translateMax = -10

type DotProps = {
    dx: SharedValue<number>
    offset: number
}

const Dot: React.FC<DotProps> = ({ dx, offset }) => {
    const animatedStyle = useAnimatedStyle(() => ({
        transform: [{ translateY: Math.max(Math.sin(dx.value - offset), 0) * translateMax }],
    }))

    return (
        <Animated.View style={[animatedStyle]}>
            <Octicons name="dot-fill" size={4} color={Style.getColor('primary-text1')} />
        </Animated.View>
    )
}

const AnimatedEllipsis = () => {
    const dx = useSharedValue(Math.PI * 2)

    useEffect(() => {
        dx.value = withRepeat(withTiming(0, { duration: 1200 }), -1)
    }, [])

    return (
        <View
            style={{
                flexDirection: 'row',
                paddingTop: 20,
                paddingBottom: 2,
                paddingHorizontal: 4,
                columnGap: 8,
            }}>
            <Dot dx={dx} offset={1.2} />
            <Dot dx={dx} offset={0.6} />
            <Dot dx={dx} offset={0} />
        </View>
    )
}

export default AnimatedEllipsis
