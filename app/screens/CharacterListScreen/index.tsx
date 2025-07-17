import Drawer from '@components/views/Drawer'

import { SafeAreaView } from 'react-native-safe-area-context'
import SettingsDrawer from '../../components/views/SettingsDrawer'
import CharacterList from './CharacterList'

const CharacterListScreen = () => {
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

export default CharacterListScreen
