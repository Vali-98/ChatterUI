import { useTranslation } from 'react-i18next'
import { SafeAreaView } from 'react-native-safe-area-context'

import Drawer from '@components/views/Drawer'
import HeaderButton from '@components/views/HeaderButton'
import HeaderTitle from '@components/views/HeaderTitle'

import UserCardEditor from './UserCardEditor'
import UserDrawer from './UserDrawer'

const UserManagerScreen = () => {
    const { t } = useTranslation()
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
                <HeaderTitle title={t('users.edit.title')} />
                <HeaderButton headerRight={() => <Drawer.Button drawerID={Drawer.ID.USERLIST} />} />
                <UserCardEditor />
                <UserDrawer />
            </SafeAreaView>
        </Drawer.Gesture>
    )
}

export default UserManagerScreen
