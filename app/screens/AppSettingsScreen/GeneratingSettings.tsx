import { useTranslation } from 'react-i18next'
import { useMMKVBoolean } from 'react-native-mmkv'

import ThemedSwitchRow from '@components/input/ThemedSwitchRow'
import SettingsPage from '@components/settings/SettingsPage'
import { AppSettings } from '@lib/constants/GlobalValues'

const GeneratingSettings = () => {
    const { t } = useTranslation()
    const [concurrent, setConcurrent] = useMMKVBoolean(AppSettings.ConcurrentGenerations)
    const [autoTitle, setAutoTitle] = useMMKVBoolean(AppSettings.AutoGenerateTitle)
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
        </SettingsPage>
    )
}

export default GeneratingSettings
