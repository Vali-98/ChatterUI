import { AlertBox } from '@components/Alert'
import useLocalAuth from '@constants/LocalAuth'
import { db, rawdb } from '@db'
import { AntDesign } from '@expo/vector-icons'
import { Style, initializeApp, startupApp } from '@globals'
import { useMigrations } from 'drizzle-orm/expo-sqlite/migrator'
import { useDrizzleStudio } from 'expo-drizzle-studio-plugin'
import { SplashScreen, Stack } from 'expo-router'
import { setOptions } from 'expo-splash-screen'
import { useEffect, useState } from 'react'
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native'
import { GestureHandlerRootView } from 'react-native-gesture-handler'
import { MenuProvider } from 'react-native-popup-menu'

import migrations from '../db/migrations/migrations'

const DevDB = () => {
    useDrizzleStudio(rawdb)
    return <></>
}

SplashScreen.preventAutoHideAsync()
setOptions({
    fade: true,
    duration: 350,
})

const Layout = () => {
    const [firstRender, setFirstRender] = useState<boolean>(true)
    const { success, error } = useMigrations(db, migrations)
    const { authorized, retry } = useLocalAuth()

    useEffect(() => {
        // reset
        if (success) {
            startupApp()
            initializeApp()
            setFirstRender(false)
            SplashScreen.hideAsync()
        }
    }, [success])

    if (error)
        return (
            <View style={styles.centeredContainer}>
                <Text style={styles.title}>Database Migration Failed!</Text>
            </View>
        )

    if (!authorized)
        return (
            <View style={styles.centeredContainer}>
                <AntDesign
                    name="lock"
                    size={120}
                    style={{ marginBottom: 12 }}
                    color={Style.getColor('primary-text3')}
                />
                <Text style={styles.title}>Authentication Required</Text>
                <TouchableOpacity onPress={retry} style={styles.button}>
                    <Text style={styles.buttonText}>Try Again</Text>
                </TouchableOpacity>
            </View>
        )

    if (!firstRender && success)
        return (
            <GestureHandlerRootView style={{ flex: 1 }}>
                {__DEV__ && <DevDB />}
                <AlertBox />
                <MenuProvider>
                    <Stack
                        screenOptions={{
                            headerStyle: { backgroundColor: Style.getColor('primary-surface1') },
                            headerTitleStyle: { color: Style.getColor('primary-text1') },
                            headerTintColor: Style.getColor('primary-text1'),
                            contentStyle: { backgroundColor: Style.getColor('primary-surface1') },
                            headerShadowVisible: false,
                            presentation: 'transparentModal',
                            statusBarBackgroundColor: Style.getColor('primary-surface1'),
                        }}>
                        <Stack.Screen name="index" options={{ animation: 'fade' }} />
                    </Stack>
                </MenuProvider>
            </GestureHandlerRootView>
        )
}

export default Layout

const styles = StyleSheet.create({
    centeredContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },

    title: {
        color: Style.getColor('primary-text1'),
        fontSize: 20,
    },

    buttonText: {
        color: Style.getColor('primary-text1'),
    },

    button: {
        paddingVertical: 12,
        paddingHorizontal: 24,
        marginTop: 120,
        columnGap: 8,
        borderRadius: 32,
        borderWidth: 2,
        borderColor: Style.getColor('primary-surface4'),
    },
})
