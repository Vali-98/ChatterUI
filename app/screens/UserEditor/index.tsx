import { AntDesign } from '@expo/vector-icons'
import { Theme } from '@lib/theme/ThemeManager'
import { Stack } from 'expo-router'
import { useState } from 'react'
import { Pressable, View } from 'react-native'
import { Gesture, GestureDetector } from 'react-native-gesture-handler'
import { runOnJS } from 'react-native-reanimated'

import UserCardEditor from './UserCardEditor'
import UserDrawer from './UserDrawer'

const UserEditor = () => {
    const { color } = Theme.useTheme()
    const [showDrawer, setShowDrawer] = useState(false)

    const handleLeftFling = () => {
        setShowDrawer(false)
    }

    const handleRightFlight = () => {
        setShowDrawer(true)
    }

    const swipeShowDrawer = Gesture.Fling()
        .direction(3)
        .onEnd(() => {
            runOnJS(handleRightFlight)()
        })

    const swipeHideDrawer = Gesture.Fling()
        .direction(1)
        .onEnd(() => {
            runOnJS(handleLeftFling)()
        })

    const gesture = Gesture.Exclusive(swipeHideDrawer, swipeShowDrawer)

    return (
        <GestureDetector gesture={gesture}>
            <View
                style={{
                    flex: 1,
                }}>
                <Stack.Screen
                    options={{
                        title: 'Edit User',
                        animation: 'simple_push',
                        headerRight: () => (
                            <Pressable onPressIn={() => setShowDrawer(!showDrawer)}>
                                <AntDesign
                                    name={showDrawer ? 'menu-fold' : 'menu-unfold'}
                                    color={color.text._100}
                                    size={24}
                                />
                            </Pressable>
                        ),
                    }}
                />
                <UserCardEditor />
                {showDrawer && <UserDrawer booleans={[showDrawer, setShowDrawer]} />}
            </View>
        </GestureDetector>
    )
}

export default UserEditor
