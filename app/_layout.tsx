import { Color, Style, initializeApp, startupApp } from '@globals'
import { Stack } from 'expo-router'
import { useEffect, useState } from 'react'
import { GestureHandlerRootView } from 'react-native-gesture-handler'
import { MenuProvider } from 'react-native-popup-menu'

// init values should be here
const Layout = () => {
    const [firstRender, setFirstRender] = useState<boolean>(true)
    // reset defaults
    useEffect(() => {
        startupApp()
        initializeApp()
        setFirstRender(false)
    }, [])

    const color = Style.useColorScheme((state) => state.colors)

    if (!firstRender)
        return (
            <GestureHandlerRootView style={{ flex: 1 }}>
                <MenuProvider>
                    <Stack
                        screenOptions={{
                            headerStyle: { backgroundColor: Style.getColor('primary-surface1') },
                            headerTitleStyle: { color: Style.getColor('primary-text1') },
                            headerTintColor: Style.getColor('primary-text1'),
                            contentStyle: { backgroundColor: Style.getColor('primary-surface1') },
                            headerShadowVisible: false,
                        }}>
                        <Stack.Screen name="index" options={{ animation: 'fade' }} />

                        <Stack.Screen
                            name="CharMenu"
                            options={{
                                animation: 'slide_from_right',
                                title: 'Characters',
                                animationDuration: 200,
                            }}
                        />

                        <Stack.Screen
                            name="CharInfo"
                            options={{
                                animation: 'fade',
                                title: 'Edit',
                                animationDuration: 200,
                            }}
                        />

                        <Stack.Screen
                            name="ChatSelector"
                            options={{
                                animation: 'fade',
                                title: 'History',
                                animationDuration: 200,
                            }}
                        />

                        <Stack.Screen
                            name="Settings"
                            options={{
                                animation: 'slide_from_left',
                                title: 'Settings',
                                animationDuration: 200,
                            }}
                        />
                    </Stack>
                </MenuProvider>
            </GestureHandlerRootView>
        )
}

export default Layout
