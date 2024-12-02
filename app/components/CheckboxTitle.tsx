import { AntDesign } from '@expo/vector-icons'
import { Style } from 'constants/Global'
import { useEffect } from 'react'
import { Text, Pressable, ViewStyle } from 'react-native'
import Animated, {
    BounceIn,
    interpolateColor,
    useAnimatedStyle,
    useSharedValue,
    withTiming,
    ZoomIn,
    ZoomOut,
} from 'react-native-reanimated'

type CheckboxTitleProps = {
    name: string
    value: boolean
    onChangeValue?: (item: boolean) => void
    style?: ViewStyle
}

const CheckboxTitle: React.FC<CheckboxTitleProps> = ({
    name,
    value,
    onChangeValue = () => {},
    style = {},
}) => {
    const colorChange = useSharedValue(value ? 1 : 0)

    const color1 = Style.getColor('primary-surface1')
    const color2 = Style.getColor('primary-brand')
    const animatedStyle = useAnimatedStyle(() => {
        return {
            backgroundColor: interpolateColor(colorChange.value, [0, 1], [color1, color2]),
        }
    })

    useEffect(() => {
        colorChange.value = withTiming(value ? 1 : 0, { duration: 100 })
    }, [value])

    return (
        <Pressable
            style={{ flexDirection: 'row', alignItems: 'center' }}
            onPress={() => {
                onChangeValue(!value)
            }}>
            <Animated.View
                style={[
                    {
                        flexDirection: 'row',
                        alignItems: `center`,
                        padding: 6,
                        borderRadius: 8,
                        borderColor: Style.getColor('primary-brand'),
                        borderWidth: 1,
                        marginVertical: 8,
                    },
                    animatedStyle,
                    style,
                ]}>
                {value && (
                    <Animated.View
                        entering={BounceIn.duration(150)}
                        exiting={ZoomOut.duration(150)}>
                        <AntDesign name="check" color={Style.getColor('primary-text1')} size={20} />
                    </Animated.View>
                )}
                {!value && (
                    <Animated.View entering={ZoomIn.duration(150)} exiting={ZoomOut.duration(150)}>
                        <AntDesign name="close" color={Style.getColor('primary-text1')} size={20} />
                    </Animated.View>
                )}
            </Animated.View>
            <Text
                style={{
                    paddingLeft: 12,
                    color: Style.getColor(value ? 'primary-text1' : 'primary-text2'),
                }}>
                {name}
            </Text>
        </Pressable>
    )
}

export default CheckboxTitle
