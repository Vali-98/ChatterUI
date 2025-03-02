import Drawer from '@components/views/Drawer'
import HeaderButton from '@components/views/HeaderButton'
import HeaderTitle from '@components/views/HeaderTitle'
import CharacterList from '@screens/CharacterMenu/CharacterList'
import { SafeAreaView } from 'react-native'
import { Gesture, GestureDetector } from 'react-native-gesture-handler'
import { runOnJS } from 'react-native-reanimated'

import SettingsDrawer from '../SettingsDrawer'

const CharacterMenu = () => {
    const { showDrawer, setShowDrawer } = Drawer.useDrawerState((state) => ({
        showDrawer: state.values?.[Drawer.ID.SETTINGS],
        setShowDrawer: (b: boolean) => state.setShow(Drawer.ID.SETTINGS, b),
    }))

    const handleLeftFling = () => {
        setShowDrawer(false)
    }

    const handleRightFlight = () => {
        setShowDrawer(true)
    }

    const swipeDrawer = Gesture.Fling()
        .direction(1)
        .onEnd(() => {
            runOnJS(handleRightFlight)()
        })
        .runOnJS(true)

    const swipeChats = Gesture.Fling()
        .direction(3)
        .onEnd(() => {
            runOnJS(handleLeftFling)()
        })
        .runOnJS(true)

    const gesture = Gesture.Exclusive(swipeDrawer, swipeChats)

    return (
        <GestureDetector gesture={gesture}>
            <SafeAreaView
                style={{
                    flex: 1,
                    flexDirection: 'row',
                }}>
                <HeaderTitle />
                <HeaderButton headerLeft={() => <Drawer.Button drawerId={Drawer.ID.SETTINGS} />} />

                <CharacterList showHeader={!showDrawer} />

                <SettingsDrawer />
            </SafeAreaView>
        </GestureDetector>
    )
}

export default CharacterMenu
