import React, { ReactNode } from 'react'
import { ViewProps } from 'react-native'
import Animated, { FadeInDown } from 'react-native-reanimated'

interface FadeUpViewProps extends ViewProps {
    children?: ReactNode
    dy?: number
    duration?: number
}

const FadeDownView: React.FC<FadeUpViewProps> = ({
    children = undefined,
    dy = 200,
    duration = 300,
    ...rest
}) => {
    return (
        <Animated.View entering={FadeInDown.duration(duration)} {...rest}>
            {children}
        </Animated.View>
    )
}

export default FadeDownView
