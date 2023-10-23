import { SafeAreaView, Text, TextInput, StyleSheet } from 'react-native'
import React from 'react'
import { Stack } from 'expo-router'
import { useMMKVString } from 'react-native-mmkv'
import { Global, Color } from '@globals'
import { useEffect } from 'react'

const Endpoint = () => {

    const [currentEndpoint, setCurrentEndpoint ] = useMMKVString(Global.Endpoint)   
    useEffect(() => {
        if(currentEndpoint === undefined || currentEndpoint === ``)
            setCurrentEndpoint(`127.0.0.1:5000`)
    }, [])

    return (
        <SafeAreaView style={styles.mainContainer}>
            <Stack.Screen options={{
                title: `Endpoint`,
                animation: `fade`,
            }}/>

            <Text style={styles.title}>Endpoint</Text>

            <TextInput 
                style={styles.input}
                value={currentEndpoint}
                onChangeText={(value) => {
                    setCurrentEndpoint(value)
                }}
            />
        </SafeAreaView>
    )
}

export default Endpoint

const styles = StyleSheet.create({

    title : {
        color: Color.White
    },

    mainContainer: {
        paddingVertical:16, 
        paddingHorizontal:20,
        backgroundColor: Color.Background,
        flex: 1,
    },

    input: {
        color: Color.White,
        backgroundColor: Color.DarkContainer,
        paddingVertical: 4,
        paddingHorizontal: 8,
        marginVertical:8,
    },
})