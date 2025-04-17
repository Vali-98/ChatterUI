import HeaderTitle from '@components/views/HeaderTitle'
import { Theme } from '@lib/theme/ThemeManager'
import React from 'react'
import { ScrollView, View } from 'react-native'

import CharacterSettings from './CharacterSettings'
import ChatSettings from './ChatSettings'
import DatabaseSettings from './DatabaseSettings'
import GeneratingSettings from './GeneratingSettings'
import ScreenSettings from './ScreenSettings'
import SecuritySettings from './SecuritySettings'
import StyleSettings from './StyleSettings'
import NotificationSettings from './NotificationSettings'

const AppSettingsMenu = () => {
    const { spacing } = Theme.useTheme()

    return (
        <ScrollView
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
        </ScrollView>
    )
}

export default AppSettingsMenu

