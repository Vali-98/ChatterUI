import { useTranslation } from 'react-i18next'
import { View } from 'react-native'
import { useMMKVBoolean, useMMKVString } from 'react-native-mmkv'

import ThemedButton from '@components/buttons/ThemedButton'
import ThemedSwitchRow from '@components/input/ThemedSwitchRow'
import ThemedTextInput from '@components/input/ThemedTextInput'
import SettingsPage from '@components/settings/SettingsPage'
import TText from '@components/text/TText'
import {
    AppSettings,
    CONTINUATION_PROMPT_KEY,
    DEFAULT_CONTINUATION_PROMPT,
} from '@lib/constants/GlobalValues'
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
                    containerStyle={{ flex: 0 }}
                    value={continuationPrompt ?? DEFAULT_CONTINUATION_PROMPT}
                    placeholder={DEFAULT_CONTINUATION_PROMPT}
                    onChangeText={setContinuationPrompt}
                />
                <TText color="400" size={12}>
                    {t('settings.generating.continuationPromptDescription')}
                </TText>
                <ThemedButton
                    label={t('common.actions.reset')}
                    iconName="reload"
                    variant="tertiary"
                    viewStyle={{ alignSelf: 'flex-end' }}
                    onPress={() => setContinuationPrompt(undefined)}
                />
            </View>
        </SettingsPage>
    )
}

export default GeneratingSettings
