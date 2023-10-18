import { SafeAreaView, Text, TextInput, StyleSheet } from 'react-native'
import React from 'react'
import { Stack } from 'expo-router'
import { useMMKVString } from 'react-native-mmkv'
import { Global } from '@globals'
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

            <Text>Endpoint</Text>

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
    mainContainer: {
        marginVertical:16, 
        marginHorizontal:20
    },

    input: {
        borderWidth: 1,
        borderRadius: 8,
        paddingVertical: 4,
        paddingHorizontal: 8,
        marginVertical:8,
    },
})