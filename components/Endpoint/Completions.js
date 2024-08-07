import { View, Text, StyleSheet, TextInput } from 'react-native'
import { useMMKVString } from 'react-native-mmkv'
import { Global, Color} from '@globals'

const Completions = () => {
    
    const [endpoint, setEndpoint] = useMMKVString(Global.CompletionsEndpoint)

    return (
        <View style={styles.mainContainer}>
            
            <Text style={styles.title}>Endpoint</Text>
            <TextInput 
                style={styles.input}
                value={endpoint}
                onChangeText={(value) => {
                    setEndpoint(value)
                }}
                placeholder='eg. https://127.0.0.1:5000'
                placeholderTextColor={Color.Offwhite}
            />
            
        </View>
    )
}

export default Completions

const styles = StyleSheet.create({
    mainContainer : {
        marginVertical:16,
        paddingVertical:16, 
        paddingHorizontal:20,
    },

    title : {
        color: Color.Text
    },

    input: {
        color: Color.Text,
        backgroundColor: Color.DarkContainer,
        paddingVertical: 4,
        paddingHorizontal: 8,
        marginVertical:8,
        borderRadius: 8,
    },

   
})