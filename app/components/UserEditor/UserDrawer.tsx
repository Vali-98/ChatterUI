import Drawer from '@components/Drawer'
import { Style } from 'constants/Global'
import { SetStateAction } from 'react'
import { StyleSheet } from 'react-native'

import UserList from './UserList'

type UserDrawerProps = {
    booleans: [boolean, (b: boolean | SetStateAction<boolean>) => void]
}

const UserDrawer: React.FC<UserDrawerProps> = ({ booleans: [showModal, setShowModal] }) => {
    return (
        <Drawer drawerStyle={styles.drawer} setShowDrawer={setShowModal} direction="right">
            <UserList setShowModal={setShowModal} />
        </Drawer>
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
        paddingBottom: 32,
    },
})
