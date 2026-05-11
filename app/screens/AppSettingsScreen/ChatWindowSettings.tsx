import React from 'react'
import { useTranslation } from 'react-i18next'
import { View } from 'react-native'
import { useMMKVBoolean } from 'react-native-mmkv'

import ThemedSwitch from '@components/input/ThemedSwitch'
import SectionTitle from '@components/text/SectionTitle'
import { AppSettings } from '@lib/constants/GlobalValues'

const ChatWindowSettings = () => {
    const { t } = useTranslation()
    const [autoScroll, setAutoScroll] = useMMKVBoolean(AppSettings.AutoScroll)
    const [sendOnEnter, setSendOnEnter] = useMMKVBoolean(AppSettings.SendOnEnter)
    const [quickDelete, setQuickDelete] = useMMKVBoolean(AppSettings.QuickDelete)
    const [saveScroll, setSaveScroll] = useMMKVBoolean(AppSettings.SaveScrollPosition)
    const [alternate, setAlternate] = useMMKVBoolean(AppSettings.AlternatingChatMode)
    const [wide, setWide] = useMMKVBoolean(AppSettings.WideChatMode)

    const [showTokensPerSecond, setShowTokensPerSecond] = useMMKVBoolean(
        AppSettings.ShowTokenPerSecond
    )

    return (
        <View style={{ rowGap: 8 }}>
            <SectionTitle>{t('settings.chatwindow.title')}</SectionTitle>

            <ThemedSwitch
                label={t('settings.chatwindow.autoScroll')}
                value={autoScroll}
                onChangeValue={setAutoScroll}
                description={t('settings.chatwindow.autoScrollDescription')}
            />

            <ThemedSwitch
                label={t('settings.chatwindow.sendOnEnter')}
                value={sendOnEnter}
                onChangeValue={setSendOnEnter}
                description={t('settings.chatwindow.sendOnEnterDescription')}
            />

            <ThemedSwitch
                label={t('settings.chatwindow.showTokensPerSecond')}
                value={showTokensPerSecond}
                onChangeValue={setShowTokensPerSecond}
                description={t('settings.chatwindow.showTokensPerSecondDescription')}
            />

            <ThemedSwitch
                label={t('settings.chatwindow.quickDelete')}
                value={quickDelete}
                onChangeValue={setQuickDelete}
                description={t('settings.chatwindow.quickDeleteDescription')}
            />

            <ThemedSwitch
                label={t('settings.chatwindow.saveScrollPosition')}
                value={saveScroll}
                onChangeValue={setSaveScroll}
                description={t('settings.chatwindow.saveScrollPositionDescription')}
            />

            <ThemedSwitch
                label={t('settings.chatwindow.wideChat')}
                value={wide}
                onChangeValue={setWide}
                description={t('settings.chatwindow.wideChatDescription')}
            />

            <ThemedSwitch
                label={t('settings.chatwindow.alternatePositions')}
                value={alternate}
                onChangeValue={setAlternate}
                description={t('settings.chatwindow.alternatePositionsDescription')}
            />
        </View>
    )
}

export default ChatWindowSettings
