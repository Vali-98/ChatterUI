import ChatMenu from '@components/ChatMenu/ChatMenu'
import { db } from '@db'
import { AntDesign } from '@expo/vector-icons'
import { Style, initializeApp, startupApp } from 'constants/Global'
import useLocalAuth from 'constants/LocalAuth'
import { useMigrations } from 'drizzle-orm/expo-sqlite/migrator'
import { SplashScreen, Stack } from 'expo-router'
import { useEffect, useState } from 'react'
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native'

import migrations from '../db/migrations/migrations'

const BlankTitle = () => <Stack.Screen options={{ title: '' }} />

const Home = () => {
    const { success, error } = useMigrations(db, migrations)
    const { authorized, retry } = useLocalAuth()

    const [firstRender, setFirstRender] = useState<boolean>(true)

    useEffect(() => {
        /**
         * Startup Routine:
         * - wait for useMigration success
         * - startupApp() - creates defaults
         * - initializeApp() - creates default dirs and files
         */
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
                <BlankTitle />
                <Text style={styles.title}>Database Migration Failed!</Text>
            </View>
        )

    if (!authorized)
        return (
            <View style={styles.centeredContainer}>
                <BlankTitle />
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
    if (!firstRender && success) return <ChatMenu />
}

export default Home

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
