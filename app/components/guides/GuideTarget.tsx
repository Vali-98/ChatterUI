import { useFocusEffect } from 'expo-router'
import { ReactNode, useCallback } from 'react'
import type { StyleProp, View, ViewStyle } from 'react-native'
import Animated, { useAnimatedRef } from 'react-native-reanimated'

import type { GuideTargetId } from '@lib/guides/definitions'
import { useGuideState } from '@lib/guides/state'

const GuideTarget = ({
    id,
    children,
    style,
}: {
    id: GuideTargetId
    children: ReactNode
    style?: StyleProp<ViewStyle>
}) => {
    const ref = useAnimatedRef<View>()
    const register = useGuideState((state) => state.register)
    const unregister = useGuideState((state) => state.unregister)
    useFocusEffect(
        useCallback(() => {
            register(id, ref)
            return () => unregister(id, ref)
        }, [id, ref, register, unregister])
    )
    return (
        <Animated.View ref={ref} collapsable={false} style={style}>
            {children}
        </Animated.View>
    )
}
export default GuideTarget
