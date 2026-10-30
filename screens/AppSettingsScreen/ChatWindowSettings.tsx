import React from 'react'
import { useTranslation } from 'react-i18next'
import { View } from 'react-native'
import { useMMKVBoolean } from 'react-native-mmkv'

import ThemedSwitchRow from '@components/input/ThemedSwitchRow'
import SectionTitle from '@components/text/SectionTitle'
import { AppSettings } from '@lib/constants/appSettings'

const ChatWindowSettings = () => {
    const { t } = useTranslation()
    const [autoScroll, setAutoScroll] = useMMKVBoolean(AppSettings.AutoScroll)
    const [sendOnEnter, setSendOnEnter] = useMMKVBoolean(AppSettings.SendOnEnter)
    const [quickDelete, setQuickDelete] = useMMKVBoolean(AppSettings.QuickDelete)
    const [saveScroll, setSaveScroll] = useMMKVBoolean(AppSettings.SaveScrollPosition)

    const [showTokensPerSecond, setShowTokensPerSecond] = useMMKVBoolean(
        AppSettings.ShowTokenPerSecond
    )

    return (
        <View style={{ rowGap: 8 }}>
            <SectionTitle>{t('settings.chatwindow.title')}</SectionTitle>

            <ThemedSwitchRow
                label={t('settings.chatwindow.autoScroll')}
                value={autoScroll}
                onChangeValue={setAutoScroll}
                description={t('settings.chatwindow.autoScrollDescription')}
            />

            <ThemedSwitchRow
                label={t('settings.chatwindow.sendOnEnter')}
                value={sendOnEnter}
                onChangeValue={setSendOnEnter}
                description={t('settings.chatwindow.sendOnEnterDescription')}
            />

            <ThemedSwitchRow
                label={t('settings.chatwindow.showTokensPerSecond')}
                value={showTokensPerSecond}
                onChangeValue={setShowTokensPerSecond}
                description={t('settings.chatwindow.showTokensPerSecondDescription')}
            />

            <ThemedSwitchRow
                label={t('settings.chatwindow.quickDelete')}
                value={quickDelete}
                onChangeValue={setQuickDelete}
                description={t('settings.chatwindow.quickDeleteDescription')}
            />

            <ThemedSwitchRow
                label={t('settings.chatwindow.saveScrollPosition')}
                value={saveScroll}
                onChangeValue={setSaveScroll}
                description={t('settings.chatwindow.saveScrollPositionDescription')}
            />
        </View>
    )
}

export default ChatWindowSettings
