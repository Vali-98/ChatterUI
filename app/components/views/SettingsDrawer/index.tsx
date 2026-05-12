import { useTranslation } from 'react-i18next'
import { Text, View } from 'react-native'
import { useMMKVBoolean } from 'react-native-mmkv'

import SupportButton from '@components/buttons/SupportButton'
import Drawer from '@components/views/Drawer'
import { AppSettings } from '@lib/constants/GlobalValues'
import { Theme } from '@lib/theme/ThemeManager'
import appConfig from 'app.config'

import AppModeToggle from './AppModeToggle'
import RouteList from './RouteList'
import UserInfo from './UserInfo'

const SettingsDrawer = () => {
    const { t } = useTranslation()
    const { color, spacing } = Theme.useTheme()
    const [devMode] = useMMKVBoolean(AppSettings.DevMode)

    return (
        <Drawer.Body
            drawerID={Drawer.ID.SETTINGS}
            drawerStyle={{
                width: '60%',
                paddingBottom: spacing.xl,
            }}>
            <UserInfo />
            <AppModeToggle />
            <RouteList />
            <Text
                style={{
                    alignSelf: 'center',
                    color: color.text._300,
                    marginTop: spacing.l,
                    marginBottom: spacing.xl2,
                }}>
                {(__DEV__ || devMode) && t('common.labels.devMode') + '\t'}
                {t('about.versionPrefix') + appConfig.expo.version}
            </Text>
            <View style={{ marginHorizontal: spacing.xl2 }}>
                <SupportButton />
            </View>
        </Drawer.Body>
    )
}

export default SettingsDrawer
