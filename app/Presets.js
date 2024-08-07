import { View, Text, StyleSheet, SafeAreaView, ScrollView } from 'react-native'
import { Stack } from 'expo-router'
import { Global } from '@globals'
import { useMMKVObject} from 'react-native-mmkv'
import CheckBox from '@react-native-community/checkbox'
import SliderItem from '@components/PresetMenu/SliderItem'
import { TextInput } from 'react-native-gesture-handler'
import { useEffect } from 'react'
const Presets = () => {
    const [currentPreset, setCurrentPreset] = useMMKVObject(Global.CurrentPreset)



    const setPresetValue = (varName, value) => {
        setCurrentPreset({...currentPreset, [varName]:value})
    }

    return (
        <SafeAreaView>
        

        <Stack.Screen options={{
                animation: `fade`,
                title: `Presets`
            }} />




        <ScrollView >
        <View style={styles.mainContainer}>
         
        <View style={{flexDirection:`row`, alignItems:`center`, paddingVertical: 4}}>
        <CheckBox 
            value={currentPreset.use_default_badwordsids}
            onValueChange={value => setPresetValue("use_default_badwordsids", value)}
        />
        <Text style={{paddingLeft: 8}}>Ban EOS Tokens</Text>
        </View>
       
        <SliderItem 
            name="Context Size" 
            varname="max_length" 
            step={16}
            min={1024}
            max={4096}
            fn={setPresetValue} 
            preset={currentPreset}
        />

        <SliderItem 
            name="Generated Tokens" 
            varname="genamt" 
            min={16}
            max={1024}
            fn={setPresetValue} 
            preset={currentPreset}
        />

        <SliderItem 
            name="Temperature" 
            varname="temp" 
            min={0}
            max={2}
            fn={setPresetValue} 
            preset={currentPreset}
            precision={2}
        />
        
        <SliderItem 
            name="Repetition Penalty" 
            varname="rep_pen" 
            min={1.0}
            max={1.5}
            fn={setPresetValue} 
            preset={currentPreset}
            precision={2}
        />
        
        <SliderItem 
            name="Repetition Penalty Range" 
            varname="rep_pen_range" 
            min={1}
            max={4096}
            fn={setPresetValue} 
            preset={currentPreset}
        />

        <SliderItem 
            name="Repetition Penalty Slope" 
            varname="rep_pen_slope" 
            min={0}
            max={10}
            fn={setPresetValue} 
            preset={currentPreset}
            precision={1}
        />

        <SliderItem 
            name="Top P" 
            varname="top_p" 
            min={0}
            max={1}
            fn={setPresetValue} 
            preset={currentPreset}
            precision={2}
        />

        <SliderItem 
            name="Top A" 
            varname="top_a" 
            min={0}
            max={1}
            fn={setPresetValue} 
            preset={currentPreset}
            precision={2}
        />

        <SliderItem 
            name="Top K" 
            varname="top_k" 
            min={0}
            max={100}
            fn={setPresetValue} 
            preset={currentPreset}
        />

        <SliderItem 
            name="Typical Sampling" 
            varname="typical" 
            min={0}
            max={1}
            fn={setPresetValue} 
            preset={currentPreset}
            precision={2}
        />

        <SliderItem 
            name="Tail-Free Sampling" 
            varname="tfs" 
            min={0}
            max={1}
            fn={setPresetValue} 
            preset={currentPreset}
            precision={2}
        />

        <SliderItem 
            name="Mirostat" 
            varname="mirostat" 
            min={0}
            max={2}
            step={1}
            fn={setPresetValue} 
            preset={currentPreset}
        />

        <SliderItem 
            name="Mirostat Tau" 
            varname="mirostat_tau" 
            min={0}
            max={20}
            fn={setPresetValue} 
            preset={currentPreset}
            precision={2}
        />

        <SliderItem 
            name="Mirostat Eta" 
            varname="mirostat_eta" 
            min={0}
            max={1}
            fn={setPresetValue} 
            preset={currentPreset}
            precision={2}
        />

        <Text style={{alignSelf:'center'}}>Grammar</Text>
        <TextInput
            style={styles.grammarbox}
            value={currentPreset.grammar}
            onChangeText={value => setPresetValue("grammar", value)}
            multiline
            numberOfLines={3}
        />


        </View>
        </ScrollView>
        </SafeAreaView>
    )
}

export default Presets

const styles = StyleSheet.create({
    mainContainer: {
        margin:16,
    },

    sliderContainer: {

    },

    slider: {
        flex:1,
        height: 40,
    },

    grammarbox : {
        borderWidth: 1,
        borderRadius: 8,
        paddingVertical: 8,
        paddingHorizontal: 8,
        marginVertical:8,
        textAlignVertical: `top`
    },
})