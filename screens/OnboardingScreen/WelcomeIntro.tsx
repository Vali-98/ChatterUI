import { SplashScreen } from 'expo-router'
import { useEffect, useState } from 'react'
import { StatusBar, StyleSheet, View, useWindowDimensions } from 'react-native'
import Animated, {
    cancelAnimation,
    Easing,
    interpolate,
    measure,
    type AnimatedRef,
    useAnimatedRef,
    useAnimatedStyle,
    useFrameCallback,
    useSharedValue,
    withDelay,
    withTiming,
} from 'react-native-reanimated'
import { scheduleOnRN } from 'react-native-worklets'

import Portal from '@components/views/Portal'

const SPLASH_IMAGE_SIZE = 200 // Matches expo-splash-screen's imageWidth.
const MOVE_DURATION = 1100
const HOLD_DURATION = 650 // Let the native splash fade finish before moving the icon.

type Target = { x: number; y: number; width: number; height: number }

const WelcomeIntro = ({
    target,
    bubbleTarget,
    onComplete,
}: {
    target: AnimatedRef<View>
    bubbleTarget: AnimatedRef<View>
    onComplete: () => void
}) => {
    const window = useWindowDimensions()
    const overlay = useAnimatedRef<View>()
    const [imageLoaded, setImageLoaded] = useState(false)
    const [splashHidden, setSplashHidden] = useState(false)
    const viewport = useSharedValue({ width: window.width, height: window.height })
    const destination = useSharedValue<Target>({ x: 0, y: 0, width: 80, height: 80 })
    const bubbleDestination = useSharedValue<Target>({ x: 0, y: 0, width: 104, height: 104 })
    const previous = useSharedValue<Target | null>(null)
    const settledSince = useSharedValue(0)
    const started = useSharedValue(false)
    const progress = useSharedValue(0)

    useEffect(() => {
        if (!imageLoaded) return
        let mounted = true
        void SplashScreen.hideAsync().then(() => {
            if (mounted) setSplashHidden(true)
        })
        return () => {
            mounted = false
        }
    }, [imageLoaded])

    const frame = useFrameCallback((info) => {
        if (started.value) return
        const bounds = measure(target)
        const root = measure(overlay)
        const bubble = measure(bubbleTarget)
        if (!bounds || !root || !bubble || bounds.width <= 0 || bounds.height <= 0) return
        const next = {
            x: bounds.pageX - root.pageX,
            y: bounds.pageY - root.pageY,
            width: bounds.width,
            height: bounds.height,
        }
        const old = previous.value
        if (
            !old ||
            Math.abs(old.x - next.x) > 0.5 ||
            Math.abs(old.y - next.y) > 0.5 ||
            old.width !== next.width ||
            old.height !== next.height
        ) {
            previous.value = next
            settledSince.value = info.timestamp
            return
        }
        if (info.timestamp - settledSince.value < 150) return
        started.value = true
        destination.value = next
        bubbleDestination.value = {
            x: bubble.pageX - root.pageX,
            y: bubble.pageY - root.pageY,
            width: bubble.width,
            height: bubble.height,
        }
        progress.value = withDelay(
            HOLD_DURATION,
            withTiming(
                1,
                { duration: MOVE_DURATION, easing: Easing.inOut(Easing.cubic) },
                (finished) => {
                    if (finished) scheduleOnRN(onComplete)
                }
            )
        )
    }, false)
    useEffect(() => {
        frame.setActive(splashHidden)
        return () => {
            frame.setActive(false)
            cancelAnimation(progress)
        }
    }, [frame, splashHidden, progress])

    const backdropStyle = useAnimatedStyle(() => ({
        left: interpolate(progress.value, [0, 1], [0, bubbleDestination.value.x]),
        top: interpolate(progress.value, [0, 1], [0, bubbleDestination.value.y]),
        width: interpolate(
            progress.value,
            [0, 1],
            [viewport.value.width, bubbleDestination.value.width]
        ),
        height: interpolate(
            progress.value,
            [0, 1],
            [viewport.value.height, bubbleDestination.value.height]
        ),
        borderRadius: progress.value * 24,
        borderTopRightRadius: progress.value * 6,
    }))
    const iconStyle = useAnimatedStyle(() => ({
        left: interpolate(
            progress.value,
            [0, 1],
            [(viewport.value.width - SPLASH_IMAGE_SIZE) / 2, destination.value.x]
        ),
        top: interpolate(
            progress.value,
            [0, 1],
            [(viewport.value.height - SPLASH_IMAGE_SIZE) / 2, destination.value.y]
        ),
        width: interpolate(progress.value, [0, 1], [SPLASH_IMAGE_SIZE, destination.value.width]),
        height: interpolate(progress.value, [0, 1], [SPLASH_IMAGE_SIZE, destination.value.height]),
        borderRadius: progress.value * 20,
    }))
    const artworkStyle = useAnimatedStyle(() => {
        const width = interpolate(
            progress.value,
            [0, 1],
            [SPLASH_IMAGE_SIZE, destination.value.width]
        )
        const height = interpolate(
            progress.value,
            [0, 1],
            [SPLASH_IMAGE_SIZE, destination.value.height]
        )
        // The adaptive splash artwork has more black padding than icon.png.
        // Crop that padding as it shrinks, so its mark matches the welcome icon.
        const artworkSize = interpolate(
            progress.value,
            [0, 1],
            [SPLASH_IMAGE_SIZE, destination.value.width * 1.75]
        )
        return {
            width: artworkSize,
            height: artworkSize,
            left: (width - artworkSize) / 2,
            top: (height - artworkSize) / 2,
        }
    })
    return (
        <Portal name="onboarding-welcome-intro">
            <StatusBar barStyle="light-content" />
            <Animated.View
                ref={overlay}
                collapsable={false}
                style={StyleSheet.absoluteFill}
                onLayout={(event) => {
                    viewport.value = event.nativeEvent.layout
                }}>
                <Animated.View
                    style={[{ position: 'absolute', backgroundColor: '#000' }, backdropStyle]}
                />
                <Animated.View
                    style={[
                        { position: 'absolute', overflow: 'hidden', backgroundColor: '#000' },
                        iconStyle,
                    ]}>
                    <Animated.Image
                        source={require('../../assets/images/adaptive-icon.png')}
                        onLoad={() => setImageLoaded(true)}
                        style={[{ position: 'absolute' }, artworkStyle]}
                    />
                </Animated.View>
            </Animated.View>
        </Portal>
    )
}
export default WelcomeIntro
