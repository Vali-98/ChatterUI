import ThemedButton from '@components/buttons/ThemedButton'
import { AntDesign } from '@expo/vector-icons'
import { Theme } from '@lib/theme/ThemeManager'
import { useFocusEffect } from 'expo-router'
import React, { ComponentProps, ReactNode, useCallback } from 'react'
import { BackHandler, StyleSheet, View, ViewStyle } from 'react-native'
import { FlingGesture, GestureDetector, Gesture as GS } from 'react-native-gesture-handler'
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
import { create } from 'zustand'

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

type DrawerBodyProps = {
    drawerID: Drawer.ID
    direction?: Direction
    drawerStyle?: ViewStyle
    children?: ReactNode
}

type DrawerButtonProps = {
    drawerID: Drawer.ID
    openIcon?: keyof typeof AntDesign.glyphMap
    closeIcon?: keyof typeof AntDesign.glyphMap
}

type DrawerGestureConfig = {
    drawerID: Drawer.ID
    closeDirection: Direction
    openDirection: Direction
}

const DirectionToGestureMap: Record<Direction, number> = {
    left: 2,
    right: 1,
    up: 4,
    down: 8,
}

interface DrawerGestureProps extends Omit<ComponentProps<typeof GestureDetector>, 'gesture'> {
    config: DrawerGestureConfig[]
}

type DrawerStateProps = {
    values: Record<string, boolean>
    setShow: (key: string, value: boolean) => void
}

namespace Drawer {
    export enum ID {
        SETTINGS = 'settings',
        CHATLIST = 'chats',
        USERLIST = 'userlist',
    }

    export const Body: React.FC<DrawerBodyProps> = ({
        drawerID: drawerId,
        direction = 'left',
        drawerStyle = {},
        children = undefined,
    }) => {
        const styles = useStyles()
        const { setShow, show } = useDrawerState((state) => ({
            setShow: state.setShow,
            show: state.values?.[drawerId],
        }))
        const handleOverlayClick = () => setShow(drawerId, false)

        useFocusEffect(
            useCallback(() => {
                const backAction = () => {
                    if (show) {
                        setShow(drawerId, false)
                        return true
                    }
                    return false
                }
                const handler = BackHandler.addEventListener('hardwareBackPress', backAction)
                return () => handler.remove()
            }, [show])
        )

        if (show)
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

    export const Button: React.FC<DrawerButtonProps> = ({
        drawerID: drawerId,
        openIcon = 'menu-fold',
        closeIcon = 'close',
    }) => {
        const { setShow, show } = useDrawerState((state) => ({
            setShow: state.setShow,
            show: state.values?.[drawerId],
        }))
        return (
            <ThemedButton
                iconSize={24}
                onPressIn={() => {
                    setShow(drawerId, !show)
                }}
                variant="tertiary"
                iconName={show ? closeIcon : openIcon}
            />
        )
    }

    export const Gesture: React.FC<DrawerGestureProps> = ({ config, ...rest }) => {
        const { setShowDrawer, values } = Drawer.useDrawerState((state) => ({
            setShowDrawer: state.setShow,
            values: state.values,
        }))

        const drawerShown = config.map((item) => values?.[item.drawerID]).some((item) => item)

        const gestures: FlingGesture[] = []
        config.forEach((item) => {
            gestures.push(
                GS.Fling()
                    .direction(DirectionToGestureMap[item.closeDirection])
                    .onEnd(() => {
                        setShowDrawer(item.drawerID, false)
                    })
                    .runOnJS(true)
                    .enabled(values?.[item.drawerID])
            )

            gestures.push(
                GS.Fling()
                    .direction(DirectionToGestureMap[item.openDirection])
                    .onEnd(() => {
                        setShowDrawer(item.drawerID, true)
                    })
                    .runOnJS(true)
                    .enabled(!drawerShown)
            )
        })
        const gesture = GS.Simultaneous(...gestures)

        return <GestureDetector {...rest} gesture={gesture} />
    }

    export const useDrawerState = create<DrawerStateProps>((set) => ({
        values: {},
        setShow: (key, value) =>
            set((state) => ({
                ...state,
                values: { ...state.values, [key]: value },
            })),
    }))
}

export default Drawer

const useStyles = () => {
    const { color } = Theme.useTheme()
    return StyleSheet.create({
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
            backgroundColor: color.neutral._100,
            shadowColor: '#000',
            width: '80%',
            height: '100%',
            borderTopWidth: 1,
            elevation: 20,
            position: 'absolute',
        },
    })
}
