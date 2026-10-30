import { SafeAreaView } from 'react-native-safe-area-context'

import { View } from 'react-native'

import Drawer from '@components/views/Drawer'
import { NoticeStack } from '@components/views/Notice'
import DownloadNotice from '@components/downloads/DownloadNotice'

import CharacterList from './CharacterList'
import SettingsDrawer from '../../components/views/SettingsDrawer'

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
                <View style={{ flex: 1 }}>
                    <CharacterList />
                    <NoticeStack>
                        <DownloadNotice />
                    </NoticeStack>
                </View>
                <SettingsDrawer />
            </SafeAreaView>
        </Drawer.Gesture>
    )
}

export default CharacterListScreen
