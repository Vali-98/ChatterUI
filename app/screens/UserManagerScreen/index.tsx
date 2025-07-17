import Drawer from '@components/views/Drawer'
import { Stack } from 'expo-router'

import { SafeAreaView } from 'react-native-safe-area-context'
import UserCardEditor from './UserCardEditor'
import UserDrawer from './UserDrawer'

const UserManagerScreen = () => {
    return (
        <Drawer.Gesture
            config={[
                { drawerID: Drawer.ID.USERLIST, openDirection: 'left', closeDirection: 'right' },
            ]}>
            <SafeAreaView
                edges={['bottom']}
                style={{
                    flex: 1,
                }}>
                <Stack.Screen
                    options={{
                        title: 'Edit User',
                        animation: 'simple_push',
                        headerRight: () => <Drawer.Button drawerID={Drawer.ID.USERLIST} />,
                    }}
                />
                <UserCardEditor />
                <UserDrawer />
            </SafeAreaView>
        </Drawer.Gesture>
    )
}

export default UserManagerScreen
