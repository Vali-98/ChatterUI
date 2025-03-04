import Drawer from '@components/views/Drawer'
import { Stack } from 'expo-router'
import { View } from 'react-native'

import UserCardEditor from './UserCardEditor'
import UserDrawer from './UserDrawer'

const UserEditor = () => {
    return (
        <Drawer.Gesture
            config={[
                { drawerID: Drawer.ID.USERLIST, openDirection: 'left', closeDirection: 'right' },
            ]}>
            <View
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
            </View>
        </Drawer.Gesture>
    )
}

export default UserEditor
