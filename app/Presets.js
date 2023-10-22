import { View, Text, StyleSheet, SafeAreaView, ScrollView, TouchableOpacity, Alert  } from 'react-native'
import { Stack } from 'expo-router'
import { useState } from 'react'
import { Global, getPresetList, writePreset, loadPreset, deletePreset, uploadPreset } from '@globals'
import { useMMKVObject, useMMKVString } from 'react-native-mmkv'
import CheckBox from '@react-native-community/checkbox'
import SliderItem from '@components/PresetMenu/SliderItem'
import { TextInput } from 'react-native-gesture-handler'
import { Dropdown } from 'react-native-element-dropdown'
import { FontAwesome } from '@expo/vector-icons'
import { useEffect } from 'react'
import TextBoxModal from '@components/TextBoxModal'
import { ToastAndroid } from 'react-native'
import * as FS from 'expo-file-system'

const Presets = () => {
    const [presetName, setPresetName] = useMMKVString(Global.PresetName)
    const [currentPreset, setCurrentPreset] = useMMKVObject(Global.CurrentPreset)
    const [presetList, setPresetList] = useState([])
    const [selectedItem, setSelectedItem] = useState(null)
    const [showNewPreset, setShowNewPreset] = useState(false)

    const loadPresetList = (name = presetName) => {
        getPresetList().then((list) => {
            const mainlist = list.map((item, index) => {return {label: item.replace(`.json`, ''), value:index}})
            setPresetList(mainlist)
            for (const item of mainlist){
                if (item.label.replace(`.json`, '') === name){
                    setSelectedItem(item.value)
                    return
                }
            }
            setSelectedItem(0)
            loadPreset(list[0].replace(`.json`, '')).then((preset)=>{
                setCurrentPreset(JSON.parse(preset))
            })
        })
    }

    useEffect(() => {
        loadPresetList()
    },[])

    const setPresetValue = (varName, value) => {
        setCurrentPreset({...currentPreset, [varName]:value})
    }

    return (
        <SafeAreaView>
        
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
                    setPresetName(text)
                    loadPresetList()
                })
            }}
        />

        <Stack.Screen options={{
                animation: `fade`,
                title: `Presets`
            }} />
        
        <View style={styles.dropdownContainer}>
            <Dropdown 
                value={selectedItem}
                style={styles.dropdownbox}
                data={presetList}
                labelField={"label"}
                valueField={"value"}
                onChange={(item)=>{
                    if(item.label === presetName) return

                    setPresetName(item.label)
                    loadPreset(item.label).then((preset) => {
                        setCurrentPreset(JSON.parse(preset))
                    })
                }}
                
            />
            <TouchableOpacity style={styles.button} 
                onPress={()=>{
                    writePreset(presetName, currentPreset).then(
                    ToastAndroid.show(`Preset Updated!`, 2000)
                )}}>
                <FontAwesome  size={24} name='save'/>
            </TouchableOpacity>
            
            <TouchableOpacity style={styles.button} 
                onPress={() => {
                    Alert.alert(`Delete Preset`, `Are you sure you want to delete \'${presetName}\'?`, 
                        [
                            {text:`Cancel`, style: `cancel`},
                            {
                                text:`Confirm`, 
                                style: `destructive`, 
                                onPress: () =>  {
                                    if(presetList.length === 1) {
                                        ToastAndroid.show(`Cannot delete last preset`, 2000)
                                        return
                                    }
                                    deletePreset(presetName).then(() => { 
                                        loadPresetList()
                                    })
                                }
                            }
                    ])
                }}> 
                <FontAwesome  size={24} name='trash' />
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
                <FontAwesome  size={24} name='upload' />
            </TouchableOpacity>
     
            <TouchableOpacity style={styles.button} onPress={async () => {
                const permissions = await FS.StorageAccessFramework.requestDirectoryPermissionsAsync();
                // Check if permission granted
                if (permissions.granted) {
                  // Get the directory uri that was approved
                  let directoryUri = permissions.directoryUri;
                  // Create file and pass it's SAF URI
                  await FS.StorageAccessFramework.createFileAsync(directoryUri, presetName, "application/json").then(async(fileUri) => {
                    // Save data to newly created file
                    await FS.writeAsStringAsync(fileUri, JSON.stringify(currentPreset), { encoding: FS.EncodingType.UTF8 });
                  })
                  .catch((e) => {
                    console.log(e);
                  });
                } 
            }}>
                <FontAwesome  size={24} name='download' />
            </TouchableOpacity>
     
            <TouchableOpacity style={styles.button}>
                <FontAwesome  size={24} name='plus' onPress={() => {setShowNewPreset(true)}} />
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

        <View style={{flexDirection:`row`, alignItems:`center`, paddingVertical: 4}}>
            <CheckBox 
                value={currentPreset.use_default_badwordsids}
                onValueChange={value => setPresetValue("use_default_badwordsids", value)}
            />
            <Text style={{paddingLeft: 8}}>Ban EOS Tokens</Text>
        </View>

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
        paddingBottom: 32,
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
        borderWidth: 1,
        borderRadius: 8,
    },

    button : {
        padding:4,
        borderWidth: 1,
        borderRadius: 4,
        marginLeft: 8,
    },
})