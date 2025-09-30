import { Theme } from '@lib/theme/ThemeManager'
import { useEffect, useRef } from 'react'
import { View, Text, ViewStyle, Pressable } from 'react-native'
import Animated, {
    Easing,
    useAnimatedStyle,
    useSharedValue,
    withTiming,
} from 'react-native-reanimated'

type HorizontalSelectorProps<T> = {
    values: {
        label: string
        value: T
    }[]
    selected: T
    onPress: (selected: T) => void
    label?: string
    description?: string
    style?: ViewStyle
    capitalizeValues?: string
}

const HorizontalSelector = <T,>({
    values,
    selected,
    onPress,
    label,
    description,
    style,
}: HorizontalSelectorProps<T>) => {
    const { color, spacing, fontSize } = Theme.useTheme()
    const viewRef = useRef<View>(null)
    const animatedValues = useSharedValue({
        top: 0,
        left: 0,
        width: 0,
        height: 0,
    })
    const animatedStyle = useAnimatedStyle(() => {
        return animatedValues.value
    })

    useEffect(() => {
        if (!viewRef.current) return
        viewRef.current.measure((x, y, width, height, pageX, pageY) => {
            animatedValues.value = withTiming(
                {
                    top: y,
                    left: x,
                    width: width - 4,
                    height: height - 4,
                },
                { duration: 300, easing: Easing.out(Easing.ease) }
            )
        })
    }, [selected])

    return (
        <View style={[{ flex: 1 }, style]}>
            {label && (
                <Text
                    style={{
                        flex: 1,
                        color: color.text._100,
                    }}>
                    {label}
                </Text>
            )}

            <View
                style={{
                    flex: 1,
                    flexDirection: 'row',
                    justifyContent: 'space-evenly',
                    borderColor: color.primary._200,
                    backgroundColor: color.neutral._100,
                    borderWidth: 2,
                    borderRadius: 8,
                    marginTop: 8,
                }}>
                <Animated.View
                    style={[
                        {
                            position: 'absolute',
                            backgroundColor: color.primary._300,
                            borderRadius: 6,
                        },
                        animatedStyle,
                    ]}
                />

                {values.map((item, index) => {
                    const isSelected = item.value === selected
                    return (
                        <Pressable
                            ref={isSelected ? viewRef : null}
                            key={index}
                            onPress={() => onPress(item.value)}
                            style={{
                                flex: 1,
                                paddingVertical: spacing.m,
                                alignItems: 'center',
                            }}>
                            <Text
                                style={{
                                    color: color.text[isSelected ? '_200' : '_500'],
                                    fontSize: fontSize.s,
                                }}>
                                {item.label}
                            </Text>
                        </Pressable>
                    )
                })}
            </View>

            {description && (
                <Text
                    style={{
                        color: color.text._400,
                        marginTop: 4,
                        paddingBottom: spacing.xs,
                        marginBottom: spacing.m,
                    }}>
                    {description}
                </Text>
            )}
        </View>
    )
}

export default HorizontalSelector
