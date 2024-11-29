import { Style } from 'constants/Global'
import { useFocusEffect } from 'expo-router'
import React, { ReactNode } from 'react'
import { StyleSheet, ViewStyle, View, BackHandler } from 'react-native'
import Animated, {
    ComplexAnimationBuilder,
    Easing,
    SlideInDown,
    SlideInLeft,
    SlideInRight,
    SlideInUp,
    SlideOutDown,
    SlideOutLeft,
    SlideOutRight,
    SlideOutUp,
} from 'react-native-reanimated'

import FadeBackrop from './FadeBackdrop'

type Direction = 'left' | 'right' | 'up' | 'down'

const animationIn: Record<Direction, ComplexAnimationBuilder> = {
    left: SlideInLeft.duration(200).easing(Easing.out(Easing.quad)),
    right: SlideInRight.duration(200).easing(Easing.out(Easing.quad)),
    up: SlideInUp.duration(200).easing(Easing.out(Easing.quad)),
    down: SlideInDown.duration(200).easing(Easing.out(Easing.quad)),
}

const animationOut: Record<Direction, ComplexAnimationBuilder> = {
    left: SlideOutLeft.duration(300).easing(Easing.out(Easing.quad)),
    right: SlideOutRight.duration(300).easing(Easing.out(Easing.quad)),
    up: SlideOutUp.duration(300).easing(Easing.out(Easing.quad)),
    down: SlideOutDown.duration(300).easing(Easing.out(Easing.quad)),
}

type DrawerProps = {
    direction?: Direction
    drawerStyle?: ViewStyle
    setShowDrawer: (b: boolean) => void
    children?: ReactNode
}

const Drawer: React.FC<DrawerProps> = ({
    setShowDrawer,
    direction = 'left',
    drawerStyle = {},
    children = undefined,
}) => {
    const handleOverlayClick = () => setShowDrawer(false)

    const backAction = () => {
        setShowDrawer(false)
        return true
    }

    useFocusEffect(() => {
        BackHandler.removeEventListener('hardwareBackPress', backAction)
        const handler = BackHandler.addEventListener('hardwareBackPress', backAction)
        return () => handler.remove()
    })

    return (
        <View style={styles.absolute}>
            <FadeBackrop handleOverlayClick={handleOverlayClick}>
                <Animated.View
                    style={{ ...styles.drawer, ...drawerStyle }}
                    entering={animationIn[direction]}
                    exiting={animationOut[direction]}>
                    {children}
                </Animated.View>
            </FadeBackrop>
        </View>
    )
}

export default Drawer

const styles = StyleSheet.create({
    absolute: {
        position: 'absolute',
        width: '100%',
        height: '100%',
    },
    backdrop: {
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
        justifyContent: 'center',
        position: 'absolute',
        width: '100%',
        height: '100%',
    },

    drawer: {
        backgroundColor: Style.getColor('primary-surface1'),
        shadowColor: Style.getColor('primary-shadow'),
        width: '80%',
        height: '100%',
        borderTopWidth: 3,
        elevation: 20,
        position: 'absolute',
    },
})
