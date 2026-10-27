import { useTextIntentStatus } from '@vali98/react-native-process-text'
import React from 'react'
import { useTranslation } from 'react-i18next'
import { View } from 'react-native'
import { useMMKVBoolean } from 'react-native-mmkv'

import ThemedSwitchRow from '@components/input/ThemedSwitchRow'
import SettingsPage from '@components/settings/SettingsPage'
import SectionTitle from '@components/text/SectionTitle'
import { AppSettings } from '@lib/constants/GlobalValues'

import ChatWindowSettings from './ChatWindowSettings'
import TagHiderSettings from './TagHiderSettings'

const ChatSettings = () => {
    const { t } = useTranslation()
    const [firstMes, setFirstMes] = useMMKVBoolean(AppSettings.CreateFirstMes)
    const [chatOnStartup, setChatOnStartup] = useMMKVBoolean(AppSettings.ChatOnStartup)
    const [autoLoadUser, setAutoLoadUser] = useMMKVBoolean(AppSettings.AutoLoadUser)
    const { enabled: textIntent, setEnabled: setTextIntent } = useTextIntentStatus()
    return (
        <SettingsPage title={t('settings.categories.chat.title')}>
            <View style={{ rowGap: 8 }}>
                <SectionTitle>{t('settings.chat.title')}</SectionTitle>

                <ThemedSwitchRow
                    label={t('settings.chat.useFirstMessage')}
                    value={firstMes}
                    onChangeValue={setFirstMes}
                    description={t('settings.chat.useFirstMessageDescription')}
                />

                <ThemedSwitchRow
                    label={t('settings.chat.loadChatOnStartup')}
                    value={chatOnStartup}
                    onChangeValue={setChatOnStartup}
                    description={t('settings.chat.loadChatOnStartupDescription')}
                />

                <ThemedSwitchRow
                    label={t('settings.chat.autoLoadUser')}
                    value={autoLoadUser}
                    onChangeValue={setAutoLoadUser}
                    description={t('settings.chat.autoLoadUserDescription')}
                />

                <ThemedSwitchRow
                    label={t('settings.chat.askInChatterUI')}
                    value={textIntent}
                    onChangeValue={setTextIntent}
                    description={t('settings.chat.askInChatterUIDescription')}
                />
            </View>
            <ChatWindowSettings />
            <View style={{ rowGap: 8 }}>
                <SectionTitle>{t('settings.character.title')}</SectionTitle>
                <TagHiderSettings />
            </View>
        </SettingsPage>
    )
}

export default ChatSettings
