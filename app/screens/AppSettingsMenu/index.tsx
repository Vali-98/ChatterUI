import HeaderTitle from '@components/views/HeaderTitle'
import { Theme } from '@lib/theme/ThemeManager'
import React from 'react'
import { View } from 'react-native'

import { KeyboardAwareScrollView } from 'react-native-keyboard-controller'
import CharacterSettings from './CharacterSettings'
import ChatSettings from './ChatSettings'
import DatabaseSettings from './DatabaseSettings'
import GeneratingSettings from './GeneratingSettings'
import NotificationSettings from './NotificationSettings'
import ScreenSettings from './ScreenSettings'
import SecuritySettings from './SecuritySettings'
import StyleSettings from './StyleSettings'

const AppSettingsMenu = () => {
    const { spacing } = Theme.useTheme()

    return (
        <KeyboardAwareScrollView
            style={{
                marginVertical: spacing.xl2,
                paddingHorizontal: spacing.xl2,
                paddingBottom: spacing.xl3,
            }}
            contentContainerStyle={{ rowGap: spacing.sm }}>
            <HeaderTitle title="Settings" />

            <StyleSettings />
            <ChatSettings />
            <CharacterSettings />
            <GeneratingSettings />
            <NotificationSettings />
            <ScreenSettings />
            <DatabaseSettings />
            <SecuritySettings />

            <View style={{ paddingVertical: spacing.xl3 }} />
        </KeyboardAwareScrollView>
    )
}

export default AppSettingsMenu
