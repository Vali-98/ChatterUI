import { View, Text, StyleSheet, TextInput } from 'react-native'
import React from 'react'
import { Color } from '@globals'

const TextBox = ({name, body, varname, setValue, lines = 1, keyboardType='default', multiline = false}) => {

    return (
        <View style={styles.mainContainer}>
            <Text style={styles.title}>{name}</Text>
            <TextInput 
                multiline={lines > 1 || multiline}
                numberOfLines={lines}
                style={{...styles.input, textAlignVertical: (lines > 1)? `top` : `center`}}
                value={body[varname]?.toString() ?? ''}
                onChangeText={(value) => {
                    setValue({...body, [varname]:value})
                }}
                placeholder='----'
                placeholderTextColor={Color.TextItalic}
                keyboardType={keyboardType}
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
        color: Color.Text
    },

    input: {
        color: Color.Text,
        backgroundColor: Color.DarkContainer,
        paddingVertical: 4,
        paddingHorizontal: 8,
        marginVertical:8,
        marginHorizontal: 4,
        borderRadius: 8,
    },
})