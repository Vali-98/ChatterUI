import SupportButton from '@components/SupportButton'
import { AppSettings } from '@constants/GlobalValues'
import { FontAwesome } from '@expo/vector-icons'
import { Logger, Style } from '@globals'
import { Stack } from 'expo-router'
import React, { useState } from 'react'
import { View, Image, Text, StyleSheet, Linking, TouchableOpacity } from 'react-native'
import { useMMKVBoolean } from 'react-native-mmkv'

const About = () => {
    const [counter, setCounter] = useState<number>(0)
    const [devMode, setDevMode] = useMMKVBoolean(AppSettings.DevMode)

    const updateCounter = () => {
        if (devMode) return
        if (counter === 6) {
            Logger.log(`You have enabled dev mode.`, true)
            setDevMode(true)
        }
        setCounter(counter + 1)
    }

    const version = 'v' + require(`../app.json`).expo.version
    return (
        <View style={styles.container}>
            <Stack.Screen
                options={{
                    title: 'About',
                    animation: 'fade',
                }}
            />
            <TouchableOpacity activeOpacity={0.8} onPress={updateCounter}>
                <Image source={require('../assets/images/icon.png')} style={styles.icon} />
            </TouchableOpacity>
            <Text style={styles.titleText}>ChatterUI</Text>
            <Text style={styles.subtitleText}>
                Version {version} {devMode && '[DEV MODE]'}
            </Text>
            {devMode && (
                <TouchableOpacity
                    style={{
                        ...styles.supportButton,
                        marginTop: 24,
                        borderColor: Style.getColor('destructive-brand'),
                    }}
                    onPress={() => {
                        setCounter(0)
                        setDevMode(false)
                        Logger.log('Dev mode disabled')
                    }}>
                    <Text style={styles.supportText}>Disable Dev Mode</Text>
                </TouchableOpacity>
            )}
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
