import { SafeAreaView, View, Text } from 'react-native'
import React from 'react'
import { Stack } from 'expo-router'

const UserInfo = () => {
    return (
    <SafeAreaView>
        <Stack.Screen
            options={{
                title: 'test'
            }}
        />

        <Text>UserInfo</Text>
    </SafeAreaView>
    )
}

export default UserInfo