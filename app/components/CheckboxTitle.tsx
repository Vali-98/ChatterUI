import { AntDesign } from '@expo/vector-icons'
import { Style } from 'constants/Global'
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
    body: any
    varname: string
    setValue: (item: any) => void
    onChange?: undefined | ((item: any) => void)
    style?: ViewStyle
}

const CheckboxTitle: React.FC<CheckboxTitleProps> = ({
    name,
    body,
    varname,
    setValue,
    onChange = undefined,
    style = {},
}) => {
    const colorChange = useSharedValue(body[varname] ? 1 : 0)

    const color1 = Style.getColor('primary-surface1')
    const color2 = Style.getColor('primary-brand')
    const animatedStyle = useAnimatedStyle(() => {
        return {
            backgroundColor: interpolateColor(colorChange.value, [0, 1], [color1, color2]),
        }
    })

    return (
        <Pressable
            style={{ flexDirection: 'row', alignItems: 'center' }}
            onPress={() => {
                if (onChange) {
                    onChange(!body[varname])
                } else {
                    setValue({ ...body, [varname]: !body[varname] })
                }
                colorChange.value = withTiming(!body[varname] ? 1 : 0, { duration: 100 })
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
                {body[varname] && (
                    <Animated.View
                        entering={BounceIn.duration(150)}
                        exiting={ZoomOut.duration(150)}>
                        <AntDesign name="check" color={Style.getColor('primary-text1')} size={20} />
                    </Animated.View>
                )}
                {!body[varname] && (
                    <Animated.View entering={ZoomIn.duration(150)} exiting={ZoomOut.duration(150)}>
                        <AntDesign name="close" color={Style.getColor('primary-text2')} size={20} />
                    </Animated.View>
                )}
            </Animated.View>
            <Text
                style={{
                    paddingLeft: 12,
                    color: Style.getColor(body[varname] ? 'primary-text1' : 'primary-text2'),
                }}>
                {name}
            </Text>
        </Pressable>
    )
}

export default CheckboxTitle
