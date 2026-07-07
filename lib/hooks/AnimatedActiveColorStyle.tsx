import { useEffect } from 'react'
import {
    interpolateColor,
    useAnimatedStyle,
    useSharedValue,
    withTiming,
} from 'react-native-reanimated'

const useAnimatedActiveColorStyle = ({
    active,
    deactiveColor,
    activeColor,
}: {
    active: boolean
    deactiveColor: string
    activeColor: string
}) => {
    const activeProgress = useSharedValue(active ? 1 : 0)

    useEffect(() => {
        activeProgress.value = withTiming(active ? 1 : 0, {
            duration: 200,
        })
    }, [activeProgress, active])

    const animatedStyle = useAnimatedStyle(() => ({
        borderColor: interpolateColor(activeProgress.value, [0, 1], [deactiveColor, activeColor]),
    }))

    return animatedStyle
}

export default useAnimatedActiveColorStyle
