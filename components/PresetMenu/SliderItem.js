import { View, Text, StyleSheet, TextInput } from 'react-native'
import Slider from '@react-native-community/slider'
import { useState } from 'react'

const SliderItem = ({name, preset, varname, fn , min=0, max=1, step=0, precision=0}) => {

    const clamp = (val) => Math.min(Math.max(parseFloat(val?.toFixed(2) ?? 0), min), max)
    const [textValue, setTextValue] = useState(preset[varname].toFixed(precision))


    return (

        <View style={{alignItems: `center`}}>
        <Text>{name}</Text>
        <View style={styles.sliderContainer}>
            <Slider
                style={styles.slider}
                step = {step}
                minimumValue={min}
                maximumValue={max}
                value={preset[varname]}
                onValueChange={value => {
                    fn(varname, clamp(value))
                    setTextValue(clamp(value).toFixed(precision))
                }}
                minimumTrackTintColor="#000"
                maximumTrackTintColor="#fff"
                thumbTintColor='#000'
            />

            <TextInput 
                style={styles.textBox}
                value={textValue}
                onChangeText={setTextValue}
                onEndEditing={() => {   
                
                    if(isNaN(clamp(parseFloat(textValue))))
                        setTextValue(preset[varname].toFixed(precision))
                    else {
                        fn(varname, clamp(parseFloat(textValue)))
                        setTextValue(clamp(textValue !== null ? parseFloat(textValue) : 0).toFixed(precision) ?? min)
                    }
                }}      
                keyboardType='number-pad'
            />
        </View>
        </View>
    )
}

export default SliderItem

const styles = StyleSheet.create({

    itemName : {
        
    },

    sliderContainer: {
        flexDirection: `row`
    },

    slider: {
        flex:9,
        height: 40,
    },

    textBox: {
        borderWidth: 1,
        borderRadius: 12,
        flex:1.5,
        textAlign:`center`,
    },
})