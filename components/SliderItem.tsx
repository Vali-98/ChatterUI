import { Style } from '@globals'
import Slider from '@react-native-community/slider'
import { useState, useEffect } from 'react'
import { View, Text, StyleSheet, TextInput } from 'react-native'

type SliderItemProps = {
    name: string
    body: any
    varname: string
    setValue: (item: any) => void
    onChange?: undefined | ((item: any) => void)
    min?: number
    max?: number
    step?: number
    precision?: number
}

const SliderItem: React.FC<SliderItemProps> = ({
    name,
    body,
    varname,
    setValue,
    min = 0,
    max = 1,
    step = 0,
    precision = 0,
    onChange = undefined,
}) => {
    const clamp = (val: number) => Math.min(Math.max(parseFloat(val?.toFixed(2) ?? 0), min), max)
    const [textValue, setTextValue] = useState(body[varname]?.toFixed(precision))

    useEffect(() => {
        setTextValue(body[varname]?.toFixed(precision))
    }, [body])

    const handleSliderChange = (value: number) => {
        if (onChange) {
            onChange(clamp(value))
            setTextValue(clamp(value).toFixed(precision))
            return
        }
        setValue({ ...body, [varname]: clamp(value) })
        setTextValue(clamp(value).toFixed(precision))
    }

    const handleTextInputChange = () => {
        if (isNaN(clamp(parseFloat(textValue)))) setTextValue(body[varname].toFixed(precision))
        else {
            setValue({ ...body, [varname]: clamp(parseFloat(textValue)) })
            setTextValue(
                clamp(textValue !== null ? parseFloat(textValue) : 0).toFixed(precision) ?? min
            )
        }
    }

    return (
        <View style={{ alignItems: `center` }}>
            <Text style={styles.itemName}>{name}</Text>
            <View style={styles.sliderContainer}>
                <Slider
                    style={styles.slider}
                    step={step}
                    minimumValue={min}
                    maximumValue={max}
                    value={body[varname]}
                    onValueChange={handleSliderChange}
                    minimumTrackTintColor={Style.getColor('primary-surface4')}
                    maximumTrackTintColor={Style.getColor('primary-surface3')}
                    thumbTintColor={Style.getColor('primary-brand')}
                />

                <TextInput
                    style={styles.textBox}
                    value={textValue}
                    onChangeText={setTextValue}
                    onEndEditing={handleTextInputChange}
                    onPressOut={handleTextInputChange}
                    keyboardType="number-pad"
                />
            </View>
        </View>
    )
}

export default SliderItem

const styles = StyleSheet.create({
    itemName: {
        color: Style.getColor('primary-text1'),
    },

    sliderContainer: {
        flexDirection: `row`,
    },

    slider: {
        flex: 9,
        height: 40,
    },

    textBox: {
        borderColor: Style.getColor('primary-surface4'),
        color: Style.getColor('primary-text1'),
        borderWidth: 1,
        borderRadius: 12,
        flex: 1.5,
        textAlign: `center`,
    },
})
