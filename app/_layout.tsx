import { AlertBox } from '@components/views/Alert'
import { rawdb } from '@db'
import { Style } from '@lib/utils/Global'
import { useDrizzleStudio } from 'expo-drizzle-studio-plugin'
import { SplashScreen, Stack } from 'expo-router'
import { setOptions } from 'expo-splash-screen'
import { useEffect } from 'react'
import { Keyboard } from 'react-native'
import { GestureHandlerRootView } from 'react-native-gesture-handler'
import { MenuProvider } from 'react-native-popup-menu'

SplashScreen.preventAutoHideAsync()
setOptions({
    fade: true,
    duration: 350,
})

const Layout = () => {
    useDrizzleStudio(rawdb)

    useEffect(() => {
        const hideSubscription = Keyboard.addListener('keyboardDidHide', () => {
            Keyboard.dismiss()
        })
        return () => {
            hideSubscription.remove()
        }
    }, [])

    return (
        <GestureHandlerRootView style={{ flex: 1 }}>
            <AlertBox />
            <MenuProvider>
                <Stack
                    screenOptions={{
                        headerStyle: { backgroundColor: Style.getColor('primary-surface1') },
                        headerTitleStyle: { color: Style.getColor('primary-text1') },
                        headerTintColor: Style.getColor('primary-text1'),
                        contentStyle: { backgroundColor: Style.getColor('primary-surface1') },
                        headerShadowVisible: false,
                        headerTitleAlign: 'center',
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
