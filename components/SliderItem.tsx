import { Color } from '@globals'
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
                    onValueChange={
                        onChange
                            ? (value) => {
                                  onChange(clamp(value))
                                  setTextValue(clamp(value).toFixed(precision))
                              }
                            : (value) => {
                                  setValue({ ...body, [varname]: clamp(value) })
                                  setTextValue(clamp(value).toFixed(precision))
                              }
                    }
                    minimumTrackTintColor={Color.White}
                    maximumTrackTintColor={Color.Offwhite}
                    thumbTintColor={Color.White}
                />

                <TextInput
                    style={styles.textBox}
                    value={textValue}
                    onChangeText={setTextValue}
                    onEndEditing={() => {
                        if (isNaN(clamp(parseFloat(textValue))))
                            setTextValue(body[varname].toFixed(precision))
                        else {
                            setValue({ ...body, [varname]: clamp(parseFloat(textValue)) })
                            setTextValue(
                                clamp(textValue !== null ? parseFloat(textValue) : 0).toFixed(
                                    precision
                                ) ?? min
                            )
                        }
                    }}
                    keyboardType="number-pad"
                />
            </View>
        </View>
    )
}

export default SliderItem

const styles = StyleSheet.create({
    itemName: {
        color: Color.Text,
    },

    sliderContainer: {
        flexDirection: `row`,
    },

    slider: {
        flex: 9,
        height: 40,
    },

    textBox: {
        backgroundColor: Color.DarkContainer,
        color: Color.White,
        borderWidth: 1,
        borderRadius: 12,
        flex: 1.5,
        textAlign: `center`,
    },
})
