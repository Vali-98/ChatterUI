import { Animated, Easing } from 'react-native'
import { ReactNode } from 'react'
import { useRef, useEffect } from 'react'
type AnimatedViewProps = {
    dx?: number
    dy?: number
    fade?: number
    tduration?: number
    fduration?: number
    children?: ReactNode
    style?: any
}

const AnimatedView: React.FC<AnimatedViewProps> = ({
    dx = 0,
    dy = 0,
    fade = 1,
    tduration = 1,
    fduration = 1,
    children,
    style = {},
}) => {
    const fadeAnim = useRef(new Animated.Value(fade)).current
    const dyAnim = useRef(new Animated.Value(dy)).current
    const dxAnim = useRef(new Animated.Value(dx)).current
    useEffect(() => {
        Animated.parallel([
            Animated.timing(fadeAnim, {
                toValue: 1,
                duration: fduration,
                useNativeDriver: true,
            }),
            Animated.timing(dyAnim, {
                toValue: 0,
                duration: tduration,
                useNativeDriver: true,
                easing: Easing.out(Easing.exp),
            }),
            Animated.timing(dxAnim, {
                toValue: 0,
                duration: tduration,
                useNativeDriver: true,
                easing: Easing.out(Easing.exp),
            }),
        ]).start()
    }, [])
    return (
        <Animated.View
            style={{
                opacity: fadeAnim,
                transform: [{ translateY: dyAnim }, { translateX: dxAnim }],
                ...style,
            }}>
            {children}
        </Animated.View>
    )
}

export default AnimatedView
