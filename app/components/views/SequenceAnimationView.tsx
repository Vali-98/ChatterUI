import { ReactNode } from 'react'
import { View, ViewStyle } from 'react-native'
import Animated, { BaseAnimationBuilder } from 'react-native-reanimated'
import { scheduleOnRN } from 'react-native-worklets'

type SequenceAnimationViewProps = {
    style?: ViewStyle
    children?: ReactNode
    animation?: (index: number) => BaseAnimationBuilder
    onComplete?: () => void
}

const SequenceAnimationView: React.FC<SequenceAnimationViewProps> = ({
    style,
    children,
    animation,
    onComplete,
}) => {
    const isArray = Array.isArray(children)

    const handleFinish = () => {
        'worklet'
        onComplete && scheduleOnRN(onComplete)
    }

    const handleAnimation = (index: number, last: boolean) => {
        const anim = animation?.(index)
        if (anim && last) {
            return anim.withCallback(handleFinish)
        }
        return anim
    }

    if (isArray)
        return (
            <View style={style}>
                {children.map((child, index) => (
                    <Animated.View
                        entering={handleAnimation(index, index === children.length - 1)}
                        key={index}>
                        {child}
                    </Animated.View>
                ))}
            </View>
        )

    return (
        <Animated.View style={style} entering={animation?.(0)}>
            {children}
        </Animated.View>
    )
}

export default SequenceAnimationView
