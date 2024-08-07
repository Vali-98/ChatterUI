import { View, Text, StyleSheet, TextInput } from 'react-native'
import React from 'react'

const TextBox = ({text, instruct, varname, setvalue, lines = 1}) => {

    return (
        <View style={styles.mainContainer}>
            <Text>{text}</Text>
            <TextInput 
                multiline={lines > 1}
                numberOfLines={lines}
                style={{...styles.input, textAlignVertical: (lines > 1)? `top` : `center`}}
                value={instruct[varname]}
                onChangeText={(value) => {
                    setvalue({...instruct, [varname]:value})
                }}
                placeholder='----'
            />
        </View>
    )
}

export default TextBox

const styles = StyleSheet.create({
    mainContainer: {
        marginBottom: 8,
        flex:1,
    },

    input: {
        borderWidth: 1,
        borderRadius: 8,
        paddingVertical: 4,
        paddingHorizontal: 8,
        marginVertical:8,
        marginHorizontal: 4,
    },
})