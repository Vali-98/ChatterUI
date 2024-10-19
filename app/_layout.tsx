import { AlertBox } from '@components/Alert'
import { db, rawdb } from '@db'
import { Style, initializeApp, startupApp } from '@globals'
import { useMigrations } from 'drizzle-orm/expo-sqlite/migrator'
import { useDrizzleStudio } from 'expo-drizzle-studio-plugin'
import { SplashScreen, Stack } from 'expo-router'
import { useEffect, useState } from 'react'
import { View, Text } from 'react-native'
import { GestureHandlerRootView } from 'react-native-gesture-handler'
import { MenuProvider } from 'react-native-popup-menu'

import migrations from '../db/migrations/migrations'

const DevDB = () => {
    useDrizzleStudio(rawdb)
    return <></>
}

SplashScreen.preventAutoHideAsync()

const Layout = () => {
    const [firstRender, setFirstRender] = useState<boolean>(true)
    const { success, error } = useMigrations(db, migrations)

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
            <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
                <Text style={{ color: Style.getColor('primary-text1'), fontSize: 16 }}>
                    Database Migration Failed!
                </Text>
            </View>
        )

    if (!firstRender && success)
        return (
            <GestureHandlerRootView style={{ flex: 1 }}>
                {__DEV__ && <DevDB />}
                <MenuProvider>
                    <AlertBox />
                    <Stack
                        screenOptions={{
                            headerStyle: { backgroundColor: Style.getColor('primary-surface1') },
                            headerTitleStyle: { color: Style.getColor('primary-text1') },
                            headerTintColor: Style.getColor('primary-text1'),
                            contentStyle: { backgroundColor: Style.getColor('primary-surface1') },
                            headerShadowVisible: false,
                        }}>
                        <Stack.Screen name="index" options={{ animation: 'fade' }} />
                    </Stack>
                </MenuProvider>
            </GestureHandlerRootView>
        )
}

export default Layout
