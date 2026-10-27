import * as Speech from 'expo-speech'
import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { View } from 'react-native'

import ThemedButton from '@components/buttons/ThemedButton'
import DropdownSheet from '@components/input/DropdownSheet'
import ThemedSlider from '@components/input/ThemedSlider'
import ThemedSwitchRow from '@components/input/ThemedSwitchRow'
import ThemedTextInput from '@components/input/ThemedTextInput'
import SettingsPage from '@components/settings/SettingsPage'
import SectionTitle from '@components/text/SectionTitle'
import { isAudioActive, useAudioState } from '@lib/audio/state'
import { Logger } from '@lib/state/Logger'
import { Theme } from '@lib/theme/ThemeManager'
import { previewSpeech } from '@lib/tts/actions'
import { useTTSSettingsStore } from '@lib/tts/settingsStore'
import { groupBy } from '@lib/utils/Array'

type LanguageListItem = {
    [key: string]: Speech.Voice[]
}

const TTSManagerScreen = () => {
    const { t } = useTranslation()
    const { color } = Theme.useTheme()
    const audioActive = useAudioState((state) => state.recording || isAudioActive(state.session))
    const {
        voice,
        setVoice,
        enabled,
        setEnabled,
        auto,
        setAuto,
        rate,
        setRate,
        liveTTS,
        setLiveTTS,
        globalPlayer,
        setGlobalPlayer,
        keepPlayerOpen,
        setKeepPlayerOpen,
    } = useTTSSettingsStore()
    const [lang, setLang] = useState(voice?.language ?? 'en-US')
    const [modelList, setModelList] = useState<Speech.Voice[]>([])
    const languageList: LanguageListItem = groupBy(modelList, 'language')
    const [testAudioText, setTestAudioText] = useState(t('tts.test'))

    const languages = Object.keys(languageList).sort()
    const voices = languageList[lang] ?? []

    const getVoices = () =>
        Speech.getAvailableVoicesAsync()
            .then(setModelList)
            .catch((error) => Logger.error(error))

    useEffect(() => {
        void getVoices()
    }, [])

    return (
        <SettingsPage title="TTS">
            <ThemedSwitchRow
                divider
                label={t('common.actions.enable')}
                value={enabled}
                onChangeValue={(value) => {
                    if (value) {
                        void getVoices()
                    }
                    setEnabled(value)
                }}
            />
            <ThemedSwitchRow value={auto} onChangeValue={setAuto} label={t('tts.autoafter')} />

            <ThemedSwitchRow value={liveTTS} onChangeValue={setLiveTTS} label={t('tts.live')} />

            <ThemedSwitchRow
                value={globalPlayer}
                onChangeValue={setGlobalPlayer}
                label={t('tts.globalPlayer')}
                description={t('tts.globalPlayerDescription')}
            />

            <ThemedSwitchRow
                divider
                value={keepPlayerOpen}
                onChangeValue={setKeepPlayerOpen}
                label={t('tts.keepPlayerOpen')}
                description={t('tts.keepPlayerOpenDescription')}
            />

            <ThemedSlider
                label={t('tts.speed')}
                min={0.1}
                max={2.5}
                step={0.1}
                precision={1}
                value={rate}
                onValueChange={setRate}
            />

            <SectionTitle style={{ marginTop: 8 }}>
                {t('tts.language')} ({languages.length})
            </SectionTitle>
            <View style={{ flexDirection: 'row', alignItems: 'center', columnGap: 8 }}>
                <DropdownSheet
                    containerStyle={{ flex: 1 }}
                    selected={lang}
                    data={languages}
                    labelExtractor={(item) => item}
                    placeholder={t('tts.selectlang')}
                    onChangeValue={(item) => setLang(item)}
                />
                <ThemedButton
                    iconName="reload"
                    iconSize={20}
                    onPress={() => getVoices()}
                    variant="secondary"
                />
            </View>

            <SectionTitle style={{ marginTop: 8 }}>
                {t('tts.voices')} ({voices.length})
            </SectionTitle>

            <DropdownSheet
                style={{ marginBottom: 8 }}
                search
                modalTitle={t('tts.selectvoice')}
                selected={voices.find((item) => item.identifier === voice?.identifier)}
                data={voices}
                labelExtractor={(item) => item.name}
                placeholder={t('tts.selectvoice')}
                onChangeValue={(item) => setVoice(item)}
            />
            <View
                style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    columnGap: 8,
                    backgroundColor: color.neutral._100,
                }}>
                <ThemedTextInput
                    value={testAudioText}
                    onChangeText={setTestAudioText}
                    style={{ color: color.text._400, fontStyle: 'italic' }}
                />
                <ThemedButton
                    label={t('common.actions.test')}
                    variant={audioActive ? 'disabled' : 'secondary'}
                    onPress={() => {
                        if (voice === undefined) {
                            Logger.warnToast(t('tts.nospeaker'))
                            return
                        }
                        previewSpeech(testAudioText)
                    }}
                />
            </View>
        </SettingsPage>
    )
}

export default TTSManagerScreen
