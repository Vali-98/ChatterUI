import { View, Text, StyleSheet, TextInput } from 'react-native'
import React from 'react'
import { Color } from '@globals'

const TextBox = ({text, instruct, varname, setvalue, lines = 1}) => {

    return (
        <View style={styles.mainContainer}>
            <Text style={styles.title}>{text}</Text>
            <TextInput 
                multiline={lines > 1}
                numberOfLines={lines}
                style={{...styles.input, textAlignVertical: (lines > 1)? `top` : `center`}}
                value={instruct[varname]}
                onChangeText={(value) => {
                    setvalue({...instruct, [varname]:value})
                }}
                placeholder='----'
                placeholderTextColor={Color.White}
            />
        </View>
    )
}

export default TextBox

const styles = StyleSheet.create({
    mainContainer: {
        paddingBottom: 8,
        flex:1,
    },

    title : {
        color: Color.White
    },

    input: {
        color: Color.White,
        backgroundColor: Color.DarkContainer,
        paddingVertical: 4,
        paddingHorizontal: 8,
        marginVertical:8,
        marginHorizontal: 4,
    },
})