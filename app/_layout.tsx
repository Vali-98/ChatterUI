import { Color, initializeApp, startupApp } from '@globals'
import { Stack } from 'expo-router'
import { useEffect, useState } from 'react'
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

    if (!firstRender)
        return (
            <MenuProvider>
                <Stack
                    screenOptions={{
                        headerStyle: { backgroundColor: Color.Header },
                        headerTitleStyle: { color: Color.Text },
                        headerTintColor: Color.White,
                        contentStyle: { backgroundColor: Color.Background },
                    }}>
                    <Stack.Screen name="index" />

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
                            animation: 'slide_from_right',
                            title: 'Edit',
                            animationDuration: 200,
                        }}
                    />

                    <Stack.Screen
                        name="ChatSelector"
                        options={{
                            animation: 'slide_from_right',
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
        )
}

export default Layout
