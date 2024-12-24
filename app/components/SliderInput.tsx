import Slider from '@react-native-community/slider'
import { Style } from 'constants/Global'
import { useEffect, useState } from 'react'
import { View, Text, StyleSheet, TextInput } from 'react-native'

type SliderInputProps = {
    label: string
    value: number
    onValueChange: (value: number) => void
    min?: number
    max?: number
    step?: number
    precision?: number
    showInput?: boolean
    disabled?: boolean
}

const clamp = (val: number, min: number, max: number, precision: number) =>
    Math.min(Math.max(parseFloat(val?.toFixed(precision) ?? 0), min), max)

const SliderInput: React.FC<SliderInputProps> = ({
    label,
    value,
    onValueChange,
    min = 0,
    max = 1,
    step = 0,
    precision = 0,
    showInput = true,
    disabled = false,
}) => {
    const [textValue, setTextValue] = useState(value.toString())

    // This effect ensures that if `value` updates from the parent, this text is properly updated
    useEffect(() => {
        if (parseFloat(textValue) !== value) setTextValue(value.toString())
    }, [value])

    const handleSliderChange = (v: number) => {
        if (!isNaN(clamp(v, min, max, precision))) onValueChange(v)
        setTextValue(v.toString())
    }

    const handleTextInputChange = (t: string) => {
        let v = 0
        setTextValue(t)
        v = parseFloat(t)
        if (!isNaN(v)) onValueChange(clamp(v, min, max, precision))
    }

    const handleEndEdit = () => {
        const v = parseFloat(textValue)
        if (!isNaN(v)) onValueChange(clamp(v, min, max, precision))
        setTextValue(value.toString())
    }

    return (
        <View style={{ alignItems: `center` }}>
            <Text style={disabled ? styles.itemNameDisabled : styles.itemName}>{label}</Text>
            <View style={styles.sliderContainer}>
                <Slider
                    disabled={disabled}
                    style={styles.slider}
                    step={step}
                    minimumValue={min}
                    maximumValue={max}
                    value={value}
                    onSlidingComplete={handleSliderChange}
                    minimumTrackTintColor={Style.getColor('primary-surface4')}
                    maximumTrackTintColor={Style.getColor('primary-surface3')}
                    thumbTintColor={Style.getColor('primary-brand')}
                />
                {showInput && (
                    <TextInput
                        editable={!disabled}
                        style={disabled ? styles.textBoxDisabled : styles.textBox}
                        value={textValue}
                        onChangeText={handleTextInputChange}
                        keyboardType="number-pad"
                        submitBehavior="blurAndSubmit"
                        onEndEditing={handleEndEdit}
                        onSubmitEditing={handleEndEdit}
                        onBlur={handleEndEdit}
                    />
                )}
            </View>
        </View>
    )
}

export default SliderInput

const styles = StyleSheet.create({
    itemName: {
        color: Style.getColor('primary-text1'),
    },

    itemNameDisabled: {
        color: Style.getColor('primary-text3'),
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

    textBoxDisabled: {
        borderColor: Style.getColor('primary-surface4'),
        color: Style.getColor('primary-text3'),
        borderWidth: 1,
        borderRadius: 12,
        flex: 1.5,
        textAlign: `center`,
    },
})
