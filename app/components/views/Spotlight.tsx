import { useFocusEffect } from 'expo-router'
import { ReactNode, useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Pressable, ScrollView, StyleSheet, View, useWindowDimensions } from 'react-native'
import Animated, {
    Easing,
    measure,
    type AnimatedRef,
    useAnimatedRef,
    useAnimatedStyle,
    useFrameCallback,
    useSharedValue,
    withTiming,
} from 'react-native-reanimated'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { scheduleOnRN } from 'react-native-worklets'

import ThemedButton from '@components/buttons/ThemedButton'
import TText from '@components/text/TText'
import Portal from '@components/views/Portal'
import {
    getSpotlightPlacement,
    type SpotlightPlacementOptions,
    type SpotlightRect,
} from '@lib/guides/placement'
import { Theme } from '@lib/theme/ThemeManager'

type SpotlightProps = SpotlightPlacementOptions & {
    children?: ReactNode
    visible: boolean
    description: string
    onDismiss: () => void
    ready?: boolean
    portalName: string
    targetRef?: AnimatedRef<View>
    closing?: boolean
    onCloseComplete?: () => void
    centered?: boolean
    blockInteraction?: boolean
    progress?: { index: number; count: number }
    controls?: ReactNode
}
const motion = { duration: 320, easing: Easing.out(Easing.cubic) }
const emptyRect: SpotlightRect = { x: 0, y: 0, width: 0, height: 0 }

const Spotlight = ({
    children,
    visible,
    description,
    onDismiss,
    ready = true,
    portalName,
    targetRef,
    blockInteraction = false,
    centered = false,
    closing = false,
    onCloseComplete,
    progress,
    controls,
    placement = 'auto',
    gap = 16,
    allowOverlap = false,
}: SpotlightProps) => {
    const { t } = useTranslation()
    const { color } = Theme.useTheme()
    const window = useWindowDimensions()
    const insets = useSafeAreaInsets()
    const ownAnchor = useAnimatedRef<View>()
    const anchor = targetRef ?? ownAnchor
    const [measurement, setMeasurement] = useState<{
        anchor: AnimatedRef<View>
        bounds: SpotlightRect
    }>()
    const centerBounds = useMemo(
        () => ({ x: window.width / 2, y: window.height / 2, width: 0, height: 0 }),
        [window.width, window.height]
    )
    const bounds = centered ? centerBounds : measurement?.bounds
    const targetSettled = centered || measurement?.anchor === anchor
    const publishBounds = useCallback(
        (next?: SpotlightRect) => {
            if (next) setMeasurement({ anchor, bounds: next })
            else if (!blockInteraction) setMeasurement(undefined)
        },
        [anchor, blockInteraction]
    )
    const [bubbleLayout, setBubbleLayout] = useState({ width: 0, height: 0 })
    const [focused, setFocused] = useState(false)
    const opacity = useSharedValue(0)
    const entered = useRef(false)
    const overlayStyle = useAnimatedStyle(() => ({ opacity: opacity.value }))
    const previous = useSharedValue<SpotlightRect | null>(null)
    const stableSince = useSharedValue(0)
    const published = useSharedValue(false)
    const highlight = useSharedValue(emptyRect)
    const bubble = useSharedValue(emptyRect)
    const highlightPlaced = useSharedValue(false)
    const bubblePlaced = useSharedValue(false)

    const tracking = useFrameCallback((frame) => {
        if (centered) return
        const measured = measure(anchor)
        if (!measured || measured.width <= 0 || measured.height <= 0) {
            previous.value = null
            if (published.value) {
                published.value = false
                scheduleOnRN(publishBounds, undefined)
            }
            return
        }
        const next = {
            x: measured.pageX,
            y: measured.pageY,
            width: measured.width,
            height: measured.height,
        }
        const old = previous.value
        const moving =
            !old ||
            Math.abs(old.x - next.x) > 0.5 ||
            Math.abs(old.y - next.y) > 0.5 ||
            Math.abs(old.width - next.width) > 0.5 ||
            Math.abs(old.height - next.height) > 0.5
        // Once a guide is visible, follow its next target on the first valid frame.
        // Only the initial appearance waits for entrance animations to settle.
        if (blockInteraction && highlightPlaced.value) {
            previous.value = next
            if (!published.value || moving) {
                published.value = true
                scheduleOnRN(publishBounds, next)
            }
            return
        }
        if (moving) {
            previous.value = next
            stableSince.value = frame.timestamp
            if (published.value) {
                published.value = false
                scheduleOnRN(publishBounds, undefined)
            }
            return
        }
        if (!published.value && frame.timestamp - stableSince.value >= 200) {
            published.value = true
            scheduleOnRN(publishBounds, next)
        }
    }, false)
    useFocusEffect(
        useCallback(() => {
            if (!visible || !ready) return
            previous.value = null
            published.value = false
            setFocused(true)
            tracking.setActive(true)
            return () => {
                tracking.setActive(false)
                setFocused(false)
                setMeasurement(undefined)
                highlightPlaced.value = false
                bubblePlaced.value = false
            }
        }, [visible, ready, tracking, highlightPlaced, bubblePlaced, previous, published])
    )
    // A new target restarts measurement, without removing the existing guide overlay.
    useEffect(() => {
        previous.value = null
        published.value = false
    }, [anchor, previous, published, window.width, window.height])

    useEffect(() => {
        if (!bounds) return
        const x = Math.max(0, Math.min(window.width, bounds.x - 5))
        const y = Math.max(0, Math.min(window.height, bounds.y - 5))
        const right = Math.max(x, Math.min(window.width, bounds.x + bounds.width + 5))
        const bottom = Math.max(y, Math.min(window.height, bounds.y + bounds.height + 5))
        const next = centered ? centerBounds : { x, y, width: right - x, height: bottom - y }
        highlight.value = highlightPlaced.value ? withTiming(next, motion) : next
        highlightPlaced.value = true
    }, [bounds, centered, centerBounds, window.width, window.height, highlight, highlightPlaced])

    const position = getSpotlightPlacement({
        target: bounds ?? emptyRect,
        viewport: {
            width: window.width,
            height: window.height,
            topInset: insets.top,
            bottomInset: insets.bottom,
            leftInset: insets.left,
            rightInset: insets.right,
        },
        bubbleHeight: bubbleLayout.height || 180,
        placement: centered ? 'center' : placement,
        gap,
        allowOverlap,
    })
    const contentMeasured = bubbleLayout.width === position.width
    useEffect(() => {
        if (!bounds || !targetSettled || !contentMeasured) return
        bubble.value = bubblePlaced.value ? withTiming(position, motion) : position
        bubblePlaced.value = true
    }, [
        bounds,
        targetSettled,
        contentMeasured,
        position.x,
        position.y,
        position.width,
        position.height,
        bubble,
        bubblePlaced,
    ])

    const entranceReady = !!bounds && targetSettled && contentMeasured && bubbleLayout.height > 0
    useEffect(() => {
        if (!visible || !ready || !focused) {
            entered.current = false
            opacity.value = 0
            return
        }
        if (closing) {
            opacity.value = withTiming(0, { duration: 200 }, (finished) => {
                if (finished && onCloseComplete) scheduleOnRN(onCloseComplete)
            })
        } else if (entranceReady && !entered.current) {
            entered.current = true
            opacity.value = withTiming(1, { duration: 200 })
        }
    }, [visible, ready, focused, entranceReady, closing, opacity, onCloseComplete])

    const topShade = useAnimatedStyle(() => ({ height: highlight.value.y }))
    const bottomShade = useAnimatedStyle(() => ({
        top: highlight.value.y + highlight.value.height,
    }))
    const leftShade = useAnimatedStyle(() => ({
        top: highlight.value.y,
        height: highlight.value.height,
        width: highlight.value.x,
    }))
    const rightShade = useAnimatedStyle(() => ({
        top: highlight.value.y,
        height: highlight.value.height,
        left: highlight.value.x + highlight.value.width,
    }))
    const highlightStyle = useAnimatedStyle(() => ({
        left: highlight.value.x,
        top: highlight.value.y,
        width: highlight.value.width,
        height: highlight.value.height,
        opacity: highlightPlaced.value ? 1 : 0,
    }))
    const bubbleStyle = useAnimatedStyle(() => ({
        left: bubble.value.x,
        top: bubble.value.y,
        width: bubble.value.width,
        height: bubble.value.height,
        opacity: bubblePlaced.value ? 1 : 0,
    }))
    const shade = { backgroundColor: 'rgba(0,0,0,0.78)' }
    return (
        <>
            {!targetRef && !centered && (
                <Animated.View ref={ownAnchor} collapsable={false}>
                    {children}
                </Animated.View>
            )}
            {visible && ready && focused && (bounds || blockInteraction) && (
                <Portal name={portalName}>
                    <Animated.View
                        pointerEvents="box-none"
                        style={[StyleSheet.absoluteFill, overlayStyle]}>
                        {blockInteraction && (
                            <Pressable
                                style={StyleSheet.absoluteFill}
                                onPress={() => {}}
                                testID="guide-input-blocker"
                            />
                        )}
                        {bounds && (
                            <>
                                <Animated.View
                                    style={[
                                        shade,
                                        { position: 'absolute', top: 0, left: 0, right: 0 },
                                        topShade,
                                    ]}>
                                    <Pressable onPress={() => {}} style={StyleSheet.absoluteFill} />
                                </Animated.View>
                                <Animated.View
                                    style={[
                                        shade,
                                        { position: 'absolute', bottom: 0, left: 0, right: 0 },
                                        bottomShade,
                                    ]}>
                                    <Pressable onPress={() => {}} style={StyleSheet.absoluteFill} />
                                </Animated.View>
                                <Animated.View
                                    style={[shade, { position: 'absolute', left: 0 }, leftShade]}>
                                    <Pressable onPress={() => {}} style={StyleSheet.absoluteFill} />
                                </Animated.View>
                                <Animated.View
                                    style={[shade, { position: 'absolute', right: 0 }, rightShade]}>
                                    <Pressable onPress={() => {}} style={StyleSheet.absoluteFill} />
                                </Animated.View>
                                <Animated.View
                                    pointerEvents="none"
                                    style={[
                                        {
                                            position: 'absolute',
                                            borderWidth: centered ? 0 : 2,
                                            borderColor: color.primary._500,
                                            borderRadius: 12,
                                        },
                                        highlightStyle,
                                    ]}
                                />
                                <Animated.View
                                    style={[
                                        {
                                            position: 'absolute',
                                            backgroundColor: color.neutral._200,
                                            borderRadius: 18,
                                            overflow: 'hidden',
                                        },
                                        bubbleStyle,
                                    ]}>
                                    <ScrollView
                                        style={{ flex: 1, width: position.width }}
                                        showsVerticalScrollIndicator={false}
                                        keyboardShouldPersistTaps="handled">
                                        <View
                                            style={{ width: position.width, padding: 18, gap: 12 }}
                                            onLayout={(event) => {
                                                const { height } = event.nativeEvent.layout
                                                const width = position.width
                                                setBubbleLayout((old) =>
                                                    old.width === width && old.height === height
                                                        ? old
                                                        : { width, height }
                                                )
                                            }}>
                                            {progress && (
                                                <View
                                                    style={{ flexDirection: 'row', gap: 8 }}
                                                    accessibilityLabel={t('guides.progress', {
                                                        current: progress.index + 1,
                                                        total: progress.count,
                                                    })}>
                                                    {Array.from(
                                                        { length: progress.count },
                                                        (_, index) => (
                                                            <View
                                                                key={index}
                                                                style={{
                                                                    width: 7,
                                                                    height: 7,
                                                                    borderRadius: 4,
                                                                    backgroundColor:
                                                                        index === progress.index
                                                                            ? color.primary._500
                                                                            : color.text._500,
                                                                }}
                                                            />
                                                        )
                                                    )}
                                                </View>
                                            )}
                                            <TText size={16}>{description}</TText>
                                            {controls}
                                            {!controls && (
                                                <ThemedButton
                                                    variant="tertiary"
                                                    labelStyle={{ color: color.primary._500 }}
                                                    label={t('common.actions.gotIt')}
                                                    onPress={onDismiss}
                                                    buttonStyle={{ alignSelf: 'flex-end' }}
                                                />
                                            )}
                                        </View>
                                    </ScrollView>
                                </Animated.View>
                            </>
                        )}
                        {!bounds && controls && (
                            <View
                                style={{
                                    position: 'absolute',
                                    left: 16,
                                    right: 16,
                                    bottom: insets.bottom + 16,
                                    padding: 12,
                                    borderRadius: 16,
                                    backgroundColor: color.neutral._200,
                                }}>
                                {controls}
                            </View>
                        )}
                    </Animated.View>
                </Portal>
            )}
        </>
    )
}
export default Spotlight
