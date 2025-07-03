import Drawer from '@components/views/Drawer'
import CharacterList from '@screens/CharacterMenu/CharacterList'

import { SafeAreaView } from 'react-native-safe-area-context'
import SettingsDrawer from '../SettingsDrawer'

const CharacterMenu = () => {
    return (
        <Drawer.Gesture
            config={[
                { drawerID: Drawer.ID.SETTINGS, openDirection: 'right', closeDirection: 'left' },
            ]}>
            <SafeAreaView
                edges={['bottom']}
                style={{
                    flex: 1,
                    flexDirection: 'row',
                }}>
                <CharacterList />
                <SettingsDrawer />
            </SafeAreaView>
        </Drawer.Gesture>
    )
}

export default CharacterMenu
