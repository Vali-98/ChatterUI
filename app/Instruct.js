import { View, Text, SafeAreaView, TextInput} from 'react-native'
import { Stack } from 'expo-router'
import { Global } from '@globals'
import { useMMKVObject } from 'react-native-mmkv'
import { ScrollView } from 'react-native-gesture-handler'
import TextBox from '@components/InstructMenu/TextBox'
import { useEffect } from 'react'
const Instruct = () => {

    const [currentInstruct, setCurrentInstruct] = useMMKVObject(Global.CurrentInstruct)


    return (
        <SafeAreaView>
            <Stack.Screen 
                options={{
                title:`Instruct`,
                animation: `fade`,
            }}
            />
            <ScrollView>
            <View style={{marginVertical:20, marginHorizontal: 16}}>
            
            <TextBox 
                text='System Sequence'
                varname="system_prompt"
                lines={3}
                instruct={currentInstruct}
                setvalue={setCurrentInstruct}
            />
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
            </ScrollView>
        </SafeAreaView>
    )
}

export default Instruct


