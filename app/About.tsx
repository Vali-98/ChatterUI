import { View, Image, Text, StyleSheet, Linking } from 'react-native'
import React from 'react'
import { Stack } from 'expo-router'
import { Style } from '@globals'
import SupportButton from '@components/SupportButton'
import { TouchableOpacity } from 'react-native-gesture-handler'
import { FontAwesome } from '@expo/vector-icons'

const About = () => {
    const version = 'v' + require(`../app.json`).expo.version
    return (
        <View style={styles.container}>
            <Stack.Screen
                options={{
                    title: 'About',
                    animation: 'fade',
                    headerRight: () => <View></View>,
                }}
            />
            <Image source={require('../assets/images/icon.png')} style={styles.icon} />
            <Text style={styles.titleText}>ChatterUI</Text>
            <Text style={styles.subtitleText}>Version {version}</Text>
            <Text style={styles.body}>
                ChatterUI is a free and open-source application developed by Vali98
            </Text>
            <Text style={{ marginBottom: 20, ...styles.body }}>
                This app is a passion project I develop in my free time. If you're enjoying the app,
                consider supporting its development!
            </Text>
            <Text style={{ ...styles.body, marginBottom: 8 }}>Donate to ChatterUI here:</Text>
            <SupportButton />
            <Text style={styles.body}>Got an issue? Report it here:</Text>

            <Text style={styles.subtitleText}>(Don't forget to add your Logs!)</Text>
            <TouchableOpacity
                onPress={() => {
                    Linking.openURL('https://github.com/Vali-98/ChatterUI')
                }}
                style={styles.supportButton}>
                <Text style={styles.supportText}>Github Repository</Text>
                <FontAwesome name="github" size={20} color={Style.getColor('primary-text1')} />
                <Text style={styles.supportText}></Text>
            </TouchableOpacity>
        </View>
    )
}

export default About

const styles = StyleSheet.create({
    container: {
        paddingHorizontal: 64,
        paddingVertical: 32,
        justifyContent: 'center',
        alignItems: 'center',
    },
    titleText: { color: Style.getColor('primary-text1'), fontSize: 32 },
    subtitleText: { color: Style.getColor('primary-text2') },
    body: { color: Style.getColor('primary-text1'), marginTop: 20, textAlign: 'center' },
    icon: {
        width: 120,
        height: 120,
    },
    supportText: { color: Style.getColor('primary-text2'), paddingRight: 4 },

    supportButton: {
        marginTop: 8,
        alignSelf: 'center',
        flexDirection: 'row',
        alignItems: 'center',
        borderColor: Style.getColor('primary-brand'),
        padding: 8,
        paddingHorizontal: 16,
        borderWidth: 1,
        borderRadius: 16,
    },
})
