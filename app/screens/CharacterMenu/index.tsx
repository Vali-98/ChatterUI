import Drawer from '@components/views/Drawer'
import CharacterList from '@screens/CharacterMenu/CharacterList'
import { View } from 'react-native'
import { useShallow } from 'zustand/react/shallow'

import SettingsDrawer from '../SettingsDrawer'

const CharacterMenu = () => {
    const { showDrawer } = Drawer.useDrawerState(
        useShallow((state) => ({
            showDrawer: state.values?.[Drawer.ID.SETTINGS],
        }))
    )

    return (
        <Drawer.Gesture
            config={[
                { drawerID: Drawer.ID.SETTINGS, openDirection: 'right', closeDirection: 'left' },
            ]}>
            <View
                style={{
                    flex: 1,
                    flexDirection: 'row',
                }}>
                <CharacterList showHeader={!showDrawer} />
                <SettingsDrawer />
            </View>
        </Drawer.Gesture>
    )
}

export default CharacterMenu
