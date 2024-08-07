import { View, Text, StyleSheet, SafeAreaView, ScrollView, TouchableOpacity, Alert, ToastAndroid   } from 'react-native'
import { Stack } from 'expo-router'
import { useState } from 'react'
import { Global, Color, getPresetList, writePreset, loadPreset, deletePreset, uploadPreset, saveStringExternal} from '@globals'
import { useMMKVObject, useMMKVString } from 'react-native-mmkv'
import { TextInput } from 'react-native-gesture-handler'
import { Dropdown } from 'react-native-element-dropdown'
import { FontAwesome } from '@expo/vector-icons'
import { useEffect } from 'react'
import {TextBoxModal, SliderItem, TextBox, CheckboxTitle} from '@components'

const PresetsTGWUI = () => {
    const [presetName, setPresetName] = useMMKVString(Global.PresetNameTGWUI)
    const [currentPreset, setCurrentPreset] = useMMKVObject(Global.PresetTGWUI)
    const [presetList, setPresetList] = useState([])
    const [showNewPreset, setShowNewPreset] = useState(false)

    const loadPresetList = (name) => {
        getPresetList().then((list) => {
            const cleanlist = list.map(item => {return item.replace(`.json`, '')})
            const mainlist = cleanlist.map((item) => {return {label: item}})
            setPresetList(mainlist)
            // after deletion, preset may not exist and needs to be changed
            if(cleanlist.includes(name)) return
            setPresetName(cleanlist[0])
            loadPreset(cleanlist[0]).then(text => setCurrentPreset(JSON.parse(text)))
        })  
    }

    useEffect(() => {
        loadPresetList(presetName)
    },[])

    return (
        <SafeAreaView style={{backgroundColor:Color.Background}}>
        
        <TextBoxModal 
            booleans={[showNewPreset, setShowNewPreset]}
            onConfirm={(text) => {
                for(item of presetList) 
                    if(item.label === text) {
                        ToastAndroid.show(`Preset name already exists.`, 2000)
                        return
                    }

                writePreset(text, currentPreset).then(() => {
                    ToastAndroid.show(`Preset created.`, 2000)
                    loadPresetList(text)
                    setPresetName(currentPreset => text)
                })
            }}
        />

        <Stack.Screen options={{
                animation: 'slide_from_left',
                title: `Text Gen Presets`
            }} />
        
        <View style={styles.dropdownContainer}>
            <Dropdown 
                value={presetName}
                data={presetList}
                valueField={"label"}
                labelField={"label"}
                onChange={(item)=>{
                    if(item.label === presetName) return
                    setPresetName(item.label)
                    loadPreset(item.label).then((preset) => {
                        setCurrentPreset(JSON.parse(preset))
                    })
                }}
                style={styles.dropdownbox}
                selectedTextStyle={styles.selected}
                
            />
            <TouchableOpacity style={styles.button} 
                onPress={()=>{
                    writePreset(presetName, currentPreset).then(
                    ToastAndroid.show(`Preset Updated!`, 2000)
                )}}>
                <FontAwesome  size={24} name='save' color={Color.Button}/>
            </TouchableOpacity>
            
            <TouchableOpacity style={styles.button} 
                onPress={() => {
                    if(presetList.length === 1) {
                        ToastAndroid.show(`Cannot delete last preset`, 2000)
                        return
                    }                 
                    Alert.alert(`Delete Preset`, `Are you sure you want to delete \'${presetName}\'?`, 
                        [
                            {text:`Cancel`, style: `cancel`},
                            {
                                text:`Confirm`, 
                                style: `destructive`, 
                                onPress: () =>  {
                                    deletePreset(presetName).then(() => { 
                                        loadPresetList(presetName)
                                    })
                                }
                            }
                    ])
                }}> 
                <FontAwesome  size={24} name='trash' color={Color.Button}/>
            </TouchableOpacity>
            
            <TouchableOpacity style={styles.button} onPress={() => {
                uploadPreset().then(name => {
                    if(name === undefined){
                        return
                    }                  
                    loadPreset(name).then((preset)=> {
                        setCurrentPreset(JSON.parse(preset))
                        setPresetName(name)
                        loadPresetList(name)
                    })
                })
            }}> 
                <FontAwesome  size={24} name='upload' color={Color.Button}/>
            </TouchableOpacity>
     
            <TouchableOpacity style={styles.button} onPress={async () => {
               saveStringExternal(`${presetName}.json`, JSON.stringify(currentPreset))
            }}>
                <FontAwesome  size={24} name='download' color={Color.Button }/>
            </TouchableOpacity>
     
            <TouchableOpacity style={styles.button} onPress={() => {setShowNewPreset(true)}}>
                <FontAwesome  size={24} name='plus' color={Color.Button}  />
            </TouchableOpacity>
        </View>
       

        <ScrollView >
        <View style={styles.mainContainer}>
         
        <SliderItem 
            name="Context Size" 
            varname="max_length" 
            step={16}
            min={1024}
            max={8192}
            setValue={setCurrentPreset}
            body={currentPreset}
        />

        <SliderItem 
            name="Generated Tokens" 
            varname="genamt" 
            min={16}
            max={1024}
            setValue={setCurrentPreset}
            body={currentPreset}
        />

        <CheckboxTitle 
            name="Streaming"
            varname="streaming"
            setValue={setCurrentPreset}
            body={currentPreset}
        />

        <SliderItem 
            name="Temperature" 
            varname="temp" 
            min={0}
            max={2}
            setValue={setCurrentPreset}
            body={currentPreset}
            precision={2}
        />
        
        <SliderItem 
            name="Repetition Penalty" 
            varname="rep_pen" 
            min={1.0}
            max={1.5}
            setValue={setCurrentPreset}
            body={currentPreset}
            precision={2}
        />
        
        <SliderItem 
            name="Repetition Penalty Range" 
            varname="rep_pen_range" 
            min={1}
            max={4096}
            setValue={setCurrentPreset}
            body={currentPreset}
        />

        <SliderItem 
            name="Encoder Repetition Penalty" 
            varname="encoder_rep_pen"
            min={0.8}
            max={1.5}
            setValue={setCurrentPreset}
            body={currentPreset}
            precision={2}
        />

        
<       SliderItem 
            name="Frequency Penalty" 
            varname="freq_pen"
            min={-2}
            max={2}
            setValue={setCurrentPreset}
            body={currentPreset}
            precision={2}
        />

        <SliderItem 
            name="Presence Penalty" 
            varname="presence_pen"
            min={-2}
            max={2}
            setValue={setCurrentPreset}
            body={currentPreset}
            precision={2}
        />

        <SliderItem 
            name="No Repeat Ngram Size" 
            varname="no_repeat_ngram_size"
            min={0}
            max={20}
            setValue={setCurrentPreset}
            body={currentPreset}
            precision={0}
        />

        <SliderItem 
            name="Min Length" 
            varname="min_length"
            min={0}
            max={2000}
            setValue={setCurrentPreset}
            body={currentPreset}
            precision={0}
        />

        <SliderItem 
            name="Top P" 
            varname="top_p" 
            min={0}
            max={1}
            setValue={setCurrentPreset}
            body={currentPreset}
            precision={2}
        />

        <SliderItem 
            name="Top A" 
            varname="top_a" 
            min={0}
            max={1}
            setValue={setCurrentPreset}
            body={currentPreset}
            precision={2}
        />

        <SliderItem 
            name="Top K" 
            varname="top_k" 
            min={0}
            max={100}
            setValue={setCurrentPreset}
            body={currentPreset}
        />

        <SliderItem 
            name="Typical Sampling" 
            varname="typical_p" 
            min={0}
            max={1}
            setValue={setCurrentPreset}
            body={currentPreset}
            precision={2}
        />

        <SliderItem 
            name="Tail-Free Sampling" 
            varname="tfs" 
            min={0}
            max={1}
            setValue={setCurrentPreset}
            body={currentPreset}
            precision={2}
        />

        <SliderItem 
            name="Epsilon Cutoff" 
            varname="epsilon_cutoff" 
            min={0}
            max={9}
            setValue={setCurrentPreset}
            body={currentPreset}
            precision={2}
        />

        <SliderItem 
            name="Eta Cutoff" 
            varname="eta_cutoff" 
            min={0}
            max={20}
            setValue={setCurrentPreset}
            body={currentPreset}
            precision={2}
        />

        <CheckboxTitle 
            name="Do Sample"
            varname="do_sample"
            body={currentPreset}
            setValue={setCurrentPreset}
        />

        <CheckboxTitle 
            name="Add BOS Token"
            varname="add_bos_token"
            body={currentPreset}
            setValue={setCurrentPreset}
        />

        <CheckboxTitle 
            name="Ban EOS Token"
            varname="ban_eos_token"
            body={currentPreset}
            setValue={setCurrentPreset}
        />

        <CheckboxTitle 
            name="Skip Special Token"
            varname="skip_special_tokens"
            body={currentPreset}
            setValue={setCurrentPreset}
        />

        <TextBox 
            text="Banned Tokens"
            varname="banned_tokens"
            body={currentPreset}
            setvalue={setCurrentPreset}
            lines={3}
        />

        <SliderItem 
            name="CFG Scale" 
            varname="guidance_scale" 
            min={0.1}
            max={4}
            setValue={setCurrentPreset}
            body={currentPreset}
            precision={2}
        />

        <TextBox 
            text="Negative Prompts"
            varname="negative_prompt"
            body={currentPreset}
            setvalue={setCurrentPreset}
            lines={3}
        />

        <SliderItem 
            name="Number of Beams" 
            varname="num_beams" 
            min={1}
            max={20}
            step={1}
            setValue={setCurrentPreset}
            body={currentPreset}
        />

        <SliderItem 
            name="Length Penalty" 
            varname="length_penalty" 
            min={-5}
            max={5}
            setValue={setCurrentPreset}
            body={currentPreset}
            precision={1}
        />

        <CheckboxTitle 
            name="Early Stopping"
            varname="early_stopping"
            body={currentPreset}
            setValue={setCurrentPreset}
        />

        <SliderItem 
            name="Penalty Alpha" 
            varname="penalty_alpha" 
            min={0}
            max={5}
            setValue={setCurrentPreset}
            body={currentPreset}
            precision={2}
        />

        <SliderItem 
            name="Mirostat Mode" 
            varname="mirostat_mode" 
            min={0}
            max={2}
            step={1}
            setValue={setCurrentPreset}
            body={currentPreset}
        />

        <SliderItem 
            name="Mirostat Tau" 
            varname="mirostat_tau" 
            min={0}
            max={20}
            setValue={setCurrentPreset}
            body={currentPreset}
            precision={2}
        />
        
        
        <SliderItem 
            name="Mirostat Eta" 
            varname="mirostat_eta" 
            min={0}
            max={1}
            setValue={setCurrentPreset}
            body={currentPreset}
            precision={2}
        />

        <TextBox 
            text='Grammar'
            varname= "grammar_string"
            body={currentPreset}
            setvalue={setCurrentPreset}
            lines={3}
        />

        <TextBox 
            text='Seed'
            varname= "seed"
            body={currentPreset}
            setvalue={setCurrentPreset}
            keyboardType='number-pad'
        />
        
        </View>
        </ScrollView>
        </SafeAreaView>
    )
}

export default PresetsTGWUI

const styles = StyleSheet.create({
    mainContainer: {
        margin:16,
        paddingBottom: 150,
    },

    grammarbox : {
        backgroundColor: Color.DarkContainer,
        paddingVertical: 8,
        paddingHorizontal: 8,
        marginVertical:8,
        textAlignVertical: `top`,
    },

    dropdownContainer: {
        marginHorizontal: 16,
        marginTop: 16,
        flexDirection:'row',
        paddingBottom: 12,
        alignItems: 'center',
    },

    dropdownbox : {
        flex:1,
        paddingHorizontal: 8,
        backgroundColor: Color.DarkContainer,
        borderRadius: 8,
    },

    selected : {
        color: Color.Text,
    },

    button : {
        padding:5,
        backgroundColor: Color.DarkContainer,
        borderRadius: 4,
        marginLeft: 8,
    },
})