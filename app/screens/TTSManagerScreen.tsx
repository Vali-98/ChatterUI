import * as Speech from 'expo-speech'
import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { View } from 'react-native'
import { KeyboardAwareScrollView } from 'react-native-keyboard-controller'

import ThemedButton from '@components/buttons/ThemedButton'
import DropdownSheet from '@components/input/DropdownSheet'
import ThemedSlider from '@components/input/ThemedSlider'
import ThemedSwitch from '@components/input/ThemedSwitch'
import ThemedTextInput from '@components/input/ThemedTextInput'
import SectionTitle from '@components/text/SectionTitle'
import HeaderTitle from '@components/views/HeaderTitle'
import { Logger } from '@lib/state/Logger'
import { useTTSStore } from '@lib/state/TTS'
import { Theme } from '@lib/theme/ThemeManager'
import { groupBy } from '@lib/utils/Array'

type LanguageListItem = {
    [key: string]: Speech.Voice[]
}

const TTSManagerScreen = () => {
    const { t } = useTranslation()
    const { color } = Theme.useTheme()
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
    } = useTTSStore()
    const [lang, setLang] = useState(voice?.language ?? 'en-US')
    const [modelList, setModelList] = useState<Speech.Voice[]>([])
    const languageList: LanguageListItem = groupBy(modelList, 'language')
    const [testAudioText, setTestAudioText] = useState(t('tts.test'))

    const languages = Object.keys(languageList)
        .sort()
        .map((name) => {
            return name
        })

    useEffect(() => {
        getVoices()
    }, [])

    const getVoices = (value = false) => {
        Speech.getAvailableVoicesAsync().then((list) => setModelList(list))
    }

    return (
        <KeyboardAwareScrollView
            style={{
                marginVertical: 16,
                paddingVertical: 16,
                paddingHorizontal: 16,
            }}
            contentContainerStyle={{ rowGap: 8 }}>
            <HeaderTitle title="TTS" />
            <SectionTitle>{t('common.navigation.settings')}</SectionTitle>

            <ThemedSwitch
                label={t('common.actions.enable')}
                value={enabled}
                onChangeValue={(value) => {
                    if (value) {
                        getVoices(true)
                    } else Speech.stop()
                    setEnabled(value)
                }}
            />
            <ThemedSwitch
                value={auto}
                onChangeValue={(value) => {
                    if (value) {
                        setLiveTTS(false)
                    }
                    setAuto(value)
                }}
                label={t('tts.autoafter')}
            />

            <ThemedSwitch
                value={liveTTS}
                onChangeValue={(value) => {
                    if (value) {
                        setAuto(false)
                    }
                    setLiveTTS(value)
                }}
                label={t('tts.live')}
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
                {t('tts.language')} ({Object.keys(languageList).length})
            </SectionTitle>
            <View style={{ marginTop: 8 }}>
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
            </View>

            <SectionTitle style={{ marginTop: 8 }}>
                {t('tts.voices')} ({modelList.filter((item) => item.language === lang).length})
            </SectionTitle>

            <DropdownSheet
                style={{ marginBottom: 8 }}
                search
                modalTitle={t('tts.selectvoice')}
                selected={voice}
                data={languageList?.[lang] ?? []}
                labelExtractor={(item) => item.identifier}
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
                    variant="secondary"
                    onPress={() => {
                        if (voice === undefined) {
                            Logger.warnToast(t('tts.nospeaker'))
                            return
                        }
                        Speech.speak(testAudioText, {
                            language: voice.language,
                            voice: voice.identifier,
                            rate: rate,
                        })
                    }}
                />
            </View>
        </KeyboardAwareScrollView>
    )
}

export default TTSManagerScreen
