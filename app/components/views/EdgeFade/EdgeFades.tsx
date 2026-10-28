import { LinearGradient } from 'expo-linear-gradient'
import { processColor, StyleSheet, View } from 'react-native'
import Animated, { FadeIn, FadeOut } from 'react-native-reanimated'

import { Theme } from '@lib/theme/ThemeManager'

export type EdgeFadeOptions = {
    edgeLength?: number
    edgeColour?: string
}

type EdgeFadesProps = EdgeFadeOptions & {
    horizontal: boolean
    edges: { start: boolean; end: boolean }
}

const EdgeFades = ({ horizontal, edges, edgeLength = 28, edgeColour }: EdgeFadesProps) => {
    const { color } = Theme.useTheme()
    const colour = edgeColour ?? color.neutral._100
    const rgba = processColor(colour)
    const clear =
        typeof rgba === 'number'
            ? `rgba(${(rgba >>> 16) & 255},${(rgba >>> 8) & 255},${rgba & 255},0)`
            : 'transparent'
    const direction = horizontal ? { x: 1, y: 0 } : { x: 0, y: 1 }
    if (edgeLength <= 0) return null
    return (
        <View pointerEvents="none" style={StyleSheet.absoluteFill}>
            {edges.start && (
                <Animated.View
                    entering={FadeIn.duration(150)}
                    exiting={FadeOut.duration(150)}
                    style={
                        horizontal
                            ? {
                                  position: 'absolute',
                                  left: 0,
                                  top: 0,
                                  bottom: 0,
                                  width: edgeLength,
                              }
                            : {
                                  position: 'absolute',
                                  top: 0,
                                  left: 0,
                                  right: 0,
                                  height: edgeLength,
                              }
                    }>
                    <LinearGradient
                        colors={[colour, clear]}
                        start={{ x: 0, y: 0 }}
                        end={direction}
                        style={{ flex: 1 }}
                    />
                </Animated.View>
            )}
            {edges.end && (
                <Animated.View
                    entering={FadeIn.duration(150)}
                    exiting={FadeOut.duration(150)}
                    style={
                        horizontal
                            ? {
                                  position: 'absolute',
                                  right: 0,
                                  top: 0,
                                  bottom: 0,
                                  width: edgeLength,
                              }
                            : {
                                  position: 'absolute',
                                  bottom: 0,
                                  left: 0,
                                  right: 0,
                                  height: edgeLength,
                              }
                    }>
                    <LinearGradient
                        colors={[clear, colour]}
                        start={{ x: 0, y: 0 }}
                        end={direction}
                        style={{ flex: 1 }}
                    />
                </Animated.View>
            )}
        </View>
    )
}
export default EdgeFades
