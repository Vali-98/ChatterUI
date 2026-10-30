import { useTranslation } from 'react-i18next'
import { View } from 'react-native'
import { useMMKVBoolean, useMMKVString } from 'react-native-mmkv'

import ThemedSwitchRow from '@components/input/ThemedSwitchRow'
import ThemedTextInput from '@components/input/ThemedTextInput'
import SettingsPage from '@components/settings/SettingsPage'
import { AppSettings } from '@lib/constants/appSettings'
import { CONTINUATION_PROMPT_KEY, DEFAULT_CONTINUATION_PROMPT } from '@lib/constants/generation'
import { mmkv } from '@lib/storage/MMKV'

const GeneratingSettings = () => {
    const { t } = useTranslation()
    const [concurrent, setConcurrent] = useMMKVBoolean(AppSettings.ConcurrentGenerations)
    const [autoTitle, setAutoTitle] = useMMKVBoolean(AppSettings.AutoGenerateTitle)
    const [continuationPrompt, setContinuationPrompt] = useMMKVString(CONTINUATION_PROMPT_KEY, mmkv)
    return (
        <SettingsPage title={t('settings.categories.generation.title')}>
            <ThemedSwitchRow
                label={t('settings.chat.concurrentGenerations')}
                description={t('settings.chat.concurrentGenerationsDescription')}
                value={concurrent ?? true}
                onChangeValue={setConcurrent}
            />
            <ThemedSwitchRow
                label={t('settings.chat.autoGenerateTitles')}
                description={t('settings.chat.autoGenerateTitlesDescription')}
                value={autoTitle}
                onChangeValue={setAutoTitle}
            />
            <View style={{ rowGap: 8, marginTop: 12 }}>
                <ThemedTextInput
                    label={t('settings.generating.continuationPrompt')}
                    multiline
                    numberOfLines={4}
                    value={continuationPrompt ?? DEFAULT_CONTINUATION_PROMPT}
                    placeholder={DEFAULT_CONTINUATION_PROMPT}
                    onChangeText={setContinuationPrompt}
                    description={t('settings.generating.continuationPromptDescription')}
                    toolbar={
                        <ThemedTextInput.Action
                            label={t('common.actions.reset')}
                            iconName="reload"
                            onPress={() => setContinuationPrompt(undefined)}
                        />
                    }
                />
            </View>
        </SettingsPage>
    )
}

export default GeneratingSettings
