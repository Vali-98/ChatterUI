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
    duration = 200,
    colorProp = 'borderColor',
}: {
    active: boolean
    deactiveColor: string
    activeColor: string
    duration?: number
    colorProp?: 'backgroundColor' | 'borderColor'
}) => {
    const activeProgress = useSharedValue(active ? 1 : 0)

    useEffect(() => {
        activeProgress.value = withTiming(active ? 1 : 0, {
            duration: duration,
        })
    }, [activeProgress, active, duration])

    const animatedStyle = useAnimatedStyle(() => ({
        [colorProp]: interpolateColor(activeProgress.value, [0, 1], [deactiveColor, activeColor]),
    }))

    return animatedStyle
}

export default useAnimatedActiveColorStyle
