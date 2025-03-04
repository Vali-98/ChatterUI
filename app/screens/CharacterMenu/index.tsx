import Drawer from '@components/views/Drawer'
import HeaderButton from '@components/views/HeaderButton'
import HeaderTitle from '@components/views/HeaderTitle'
import CharacterList from '@screens/CharacterMenu/CharacterList'
import { SafeAreaView } from 'react-native'

import SettingsDrawer from '../SettingsDrawer'

const CharacterMenu = () => {
    const { showDrawer } = Drawer.useDrawerState((state) => ({
        showDrawer: state.values?.[Drawer.ID.SETTINGS],
    }))

    return (
        <Drawer.Gesture
            config={[
                { drawerID: Drawer.ID.SETTINGS, openDirection: 'right', closeDirection: 'left' },
            ]}>
            <SafeAreaView
                style={{
                    flex: 1,
                    flexDirection: 'row',
                }}>
                <HeaderTitle />
                <HeaderButton headerLeft={() => <Drawer.Button drawerID={Drawer.ID.SETTINGS} />} />

                <CharacterList showHeader={!showDrawer} />

                <SettingsDrawer />
            </SafeAreaView>
        </Drawer.Gesture>
    )
}

export default CharacterMenu
