import { View, Text, SafeAreaView, TouchableOpacity, StyleSheet, ToastAndroid, Alert} from 'react-native'
import { Stack } from 'expo-router'
import { Global, Color, getInstructList, writeInstruct, loadInstruct, deleteInstruct, uploadInstruct} from '@globals'
import { useMMKVObject } from 'react-native-mmkv'
import { ScrollView } from 'react-native-gesture-handler'
import TextBox from '@components/InstructMenu/TextBox'
import CheckBox from '@react-native-community/checkbox'
import { Dropdown } from 'react-native-element-dropdown'
import { useState, useEffect } from 'react'
import { FontAwesome } from '@expo/vector-icons'
import TextBoxModal from '@components/TextBoxModal'
import * as FS from 'expo-file-system'
const Instruct = () => {

    const [instructName, setInstructName] = useMMKVObject(Global.InstructName)
    const [currentInstruct, setCurrentInstruct] = useMMKVObject(Global.CurrentInstruct)
    const [instructList, setInstructList] = useState([])
    const [selectedItem, setSelectedItem] = useState(null)
    const [showNewInstruct, setShowNewInstruct] = useState(false)

    const loadInstructList = (name) => {
        getInstructList().then((list) => {
            const mainlist = list.map((item, index) => {return {label: item.replace(`.json`, ''), value:index}})
            setInstructList(mainlist)
            for (const item of mainlist){
                if (item.label.replace(`.json`, '') === name){
                    setSelectedItem(item.value)
                    return
                }
            }
            setSelectedItem(0)
            loadInstruct(list[0].replace(`.json`, '')).then((preset)=>{
                setCurrentInstruct(JSON.parse(preset))
            })
        })
    }

    useEffect(() => {
        loadInstructList()
    },[])

    return (
        <SafeAreaView style={styles.mainContainer}>
            <Stack.Screen 
                options={{
                title:`Instruct`,
                animation: `fade`,
            }}/>
            
            <TextBoxModal 
            booleans={[showNewInstruct, setShowNewInstruct]}
            onConfirm={(text) => {
                for(item of instructList) 
                    if(item.label === text) {
                        ToastAndroid.show(`Preset name already exists.`, 2000)
                        return
                    }

                writeInstruct(text, {...currentInstruct, name: text}).then(() => {
                    ToastAndroid.show(`Preset created.`, 2000)
                    setInstructName(text)
                    loadInstructList()
                })
            }}
        />
            
            <View style={styles.dropdownContainer}>
            <Dropdown 
                value={selectedItem}
                style={styles.dropdownbox}
                data={instructList}
                selectedTextStyle={styles.selected}
                labelField={"label"}
                valueField={"value"}
                onChange={(item)=>{
                    if(item.label === instructName) return

                    setInstructName(item.label)
                    loadInstruct(item.label).then((preset) => {
                        setCurrentInstruct(JSON.parse(preset))
                    })
                }}
                
            />
            <TouchableOpacity style={styles.button} 
                onPress={()=>{
                    writeInstruct(instructName, currentInstruct).then(ToastAndroid.show(`Preset Updated!`, 2000))
                }}
                >
                <FontAwesome  size={24} name='save' color={Color.Button}/>
            </TouchableOpacity>
            
            <TouchableOpacity style={styles.button} 
                onPress={() => {
                    Alert.alert(`Delete Preset`, `Are you sure you want to delete \'${instructName}\'?`, 
                        [
                            {text:`Cancel`, style: `cancel`},
                            {
                                text:`Confirm`, 
                                style: `destructive`, 
                                onPress: () =>  {
                                    if(instructList.length === 1) {
                                        ToastAndroid.show(`Cannot delete last preset`, 2000)
                                        return
                                    }
                                    deleteInstruct(instructName).then(() => { 
                                        loadInstructList()
                                    })
                                }
                            }
                    ])
                }}> 
                <FontAwesome  size={24} name='trash' color={Color.Button}/>
            </TouchableOpacity>
            
            <TouchableOpacity style={styles.button} onPress={() => {
                uploadInstruct().then(name => {
                    if(name === undefined){
                        return
                    }                  
                    loadInstruct(name).then((instruct)=> {
                        setCurrentInstruct(JSON.parse(instruct))
                        setInstructName(name)
                        loadInstructList(name)
                    })
                })
            }}> 
                <FontAwesome  size={24} name='upload' color={Color.Button}/>
            </TouchableOpacity>
     
            <TouchableOpacity style={styles.button} onPress={async () => {
                const permissions = await FS.StorageAccessFramework.requestDirectoryPermissionsAsync()
                if (permissions.granted) {
                    let directoryUri = permissions.directoryUri;
                    await FS.StorageAccessFramework.createFileAsync(directoryUri, instructName, "application/json").then(async(fileUri) => {
                    await FS.writeAsStringAsync(fileUri, JSON.stringify(currentInstruct), { encoding: FS.EncodingType.UTF8 })
                    })
                    .catch((e) => {
                        console.log(e)
                    })
                } 
            }}>
                <FontAwesome  size={24} name='download' color={Color.Button}/>
            </TouchableOpacity>
     
            <TouchableOpacity style={styles.button} onPress={() => {setShowNewInstruct(true)}}>
                <FontAwesome  size={24} name='plus' color={Color.Button}  />
            </TouchableOpacity>
        </View>
            
            
            <ScrollView>
            <View style={{paddingVertical:20, paddingHorizontal: 16, paddingBottom: 150}}>
            
            <TextBox 
                text='System Sequence'
                varname="system_prompt"
                lines={3}
                instruct={currentInstruct}
                setvalue={setCurrentInstruct}
            />

            <View style={{flexDirection: 'row'}}>
            <TextBox 
                text='Input Sequence'
                varname='input_sequence'
                instruct={currentInstruct}
                setvalue={setCurrentInstruct}
            />
            <TextBox 
                text='Output Sequence'
                varname= "output_sequence"
                instruct={currentInstruct}
                setvalue={setCurrentInstruct}
            />
            </View>
            
            <View style={{flexDirection: 'row'}}>
            <TextBox 
                text='First Output Sequence'
                varname='first_output_sequence'
                instruct={currentInstruct}
                setvalue={setCurrentInstruct}
            />
            <TextBox 
                text='Last Output Sequence'
                varname= "last_output_sequence"
                instruct={currentInstruct}
                setvalue={setCurrentInstruct}
            />
            </View>

            <View style={{flexDirection: 'row'}}>
            <TextBox 
                text='System Sequence Suffix'
                varname='system_sequence_prefix'
                instruct={currentInstruct}
                setvalue={setCurrentInstruct}
            />
            <TextBox 
                text='System Sequence Suffix'
                varname= "system_sequence_suffix"
                instruct={currentInstruct}
                setvalue={setCurrentInstruct}
            />
            </View>

            <View style={{flexDirection: 'row'}}>
            <TextBox 
                text='Stop Sequence'
                varname='stop_sequence'
                instruct={currentInstruct}
                setvalue={setCurrentInstruct}
            />
            <TextBox 
                text='Seperator Sequence'
                varname= "separator_sequence"
                instruct={currentInstruct}
                setvalue={setCurrentInstruct}
            />
            </View>

            

            <View style={{flexDirection:`row`, alignItems:`center`, paddingVertical: 4}}>
            <CheckBox 
                tintColors={{false:Color.White, true:Color.White}}
                onFillColor={Color.White}
                onCheckColor={Color.White}
                value={currentInstruct.wrap}
                onValueChange={value => setCurrentInstruct({...currentInstruct, "wrap" : value})}
            />
            <Text style={{paddingLeft: 8, color:Color.Text}}>Wrap Sequence with Newline</Text>
        </View>

        <View style={{flexDirection:`row`, alignItems:`center`, paddingVertical: 4}}>
            <CheckBox
                tintColors={{false:Color.White, true:Color.White}}
                onFillColor={Color.White}
                onCheckColor={Color.White} 
                value={currentInstruct.macro}
                onValueChange={value => setCurrentInstruct({...currentInstruct, ["macro"] : value})}
            />
            <Text style={{paddingLeft: 8, color:Color.Text}}>Replace Macro In Sequences</Text>
        </View>

        <View style={{flexDirection:`row`, alignItems:`center`, paddingVertical: 4}}>
            <CheckBox 
                tintColors={{false:Color.White, true:Color.White}}
                onFillColor={Color.White}
                onCheckColor={Color.White}
                value={currentInstruct.names}
                onValueChange={value => setCurrentInstruct({...currentInstruct, names : value})}
            />
            <Text style={{paddingLeft: 8, color:Color.Text}}>Include Names</Text>
        </View>

        <View style={{flexDirection:`row`, alignItems:`center`, paddingVertical: 4}}>
            <CheckBox 
                tintColors={{false:Color.White, true:Color.Text}}
                onFillColor={Color.White}
                onCheckColor={Color.White}
                value={currentInstruct.names_force_groups}
                onValueChange={value => setCurrentInstruct({...currentInstruct, names_force_groups : value})}
            />
            <Text style={{paddingLeft: 8, color:Color.Text}}>Force for Groups and Personas</Text>
        </View>

            <TextBox 
                text='Activation Regex'
                varname="activation_regex"
                instruct={currentInstruct}
                setvalue={setCurrentInstruct}
            />


       

        </View>
        </ScrollView>
    </SafeAreaView>
    )
}

export default Instruct


const styles = StyleSheet.create({
    mainContainer: {
        flex: 1,
        backgroundColor: Color.Background
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