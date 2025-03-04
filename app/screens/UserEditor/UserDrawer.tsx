import Drawer from '@components/views/Drawer'
import { StyleSheet } from 'react-native'

import UserList from './UserList'

const UserDrawer = () => {
    return (
        <Drawer.Body drawerID={Drawer.ID.USERLIST} drawerStyle={styles.drawer} direction="right">
            <UserList />
        </Drawer.Body>
    )
}

export default UserDrawer

const styles = StyleSheet.create({
    drawer: {
        width: '80%',
        left: '20%',
        borderTopWidth: 3,
        elevation: 20,
        position: 'absolute',
        height: '100%',
        paddingHorizontal: 16,
        paddingTop: 16,
        paddingBottom: 24,
    },
})
