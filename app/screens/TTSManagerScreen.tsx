import ThemedButton from '@components/buttons/ThemedButton'
import DropdownSheet from '@components/input/DropdownSheet'
import ThemedSlider from '@components/input/ThemedSlider'
import ThemedSwitch from '@components/input/ThemedSwitch'
import ThemedTextInput from '@components/input/ThemedTextInput'
import SectionTitle from '@components/text/SectionTitle'
import HeaderTitle from '@components/views/HeaderTitle'
import { Logger } from '@lib/state/Logger'
import { useTTS } from '@lib/state/TTS'
import { Theme } from '@lib/theme/ThemeManager'
import { groupBy } from '@lib/utils/Array'
import * as Speech from 'expo-speech'
import { useEffect, useState } from 'react'
import { View } from 'react-native'
import { KeyboardAwareScrollView } from 'react-native-keyboard-controller'
import { useSafeAreaInsets } from 'react-native-safe-area-context'

type LanguageListItem = {
    [key: string]: Speech.Voice[]
}

const TTSManagerScreen = () => {
    const { color } = Theme.useTheme()
    const { voice, setVoice, enabled, setEnabled, auto, setAuto, rate, setRate, live, setLive } =
        useTTS()
    const [lang, setLang] = useState(voice?.language ?? 'en-US')
    const [modelList, setModelList] = useState<Speech.Voice[]>([])
    const languageList: LanguageListItem = groupBy(modelList, 'language')
    const [testAudioText, setTestAudioText] = useState('This is a test audio')

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
    const insets = useSafeAreaInsets()
    return (
        <KeyboardAwareScrollView
            style={{
                marginVertical: 16,
                paddingVertical: 16,
                paddingHorizontal: 16,
            }}
            contentContainerStyle={{ rowGap: 8 }}>
            <HeaderTitle title="TTS" />
            <SectionTitle>Settings</SectionTitle>

            <ThemedSwitch
                label="Enable"
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
                        setLive(false)
                    }
                    setAuto(value)
                }}
                label="Automatically TTS After Inference"
            />

            <ThemedSwitch
                value={live}
                onChangeValue={(value) => {
                    if (value) {
                        setAuto(false)
                    }
                    setLive(value)
                }}
                label="Automatically TTS During Inference"
            />

            <ThemedSlider
                label="Speed"
                min={0.1}
                max={2.5}
                step={0.1}
                precision={1}
                value={rate}
                onValueChange={setRate}
            />

            <SectionTitle style={{ marginTop: 8 }}>
                Language ({Object.keys(languageList).length})
            </SectionTitle>
            <View style={{ marginTop: 8 }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', columnGap: 8 }}>
                    <DropdownSheet
                        containerStyle={{ flex: 1 }}
                        selected={lang}
                        data={languages}
                        labelExtractor={(item) => item}
                        placeholder="Select Language"
                        onChangeValue={(item) => setLang(item)}
                    />
                    <ThemedButton
                        iconName="reload1"
                        iconSize={20}
                        onPress={() => getVoices()}
                        variant="secondary"
                    />
                </View>
            </View>

            <SectionTitle style={{ marginTop: 8 }}>
                Voices ({modelList.filter((item) => item.language === lang).length})
            </SectionTitle>

            <DropdownSheet
                style={{ marginBottom: 8 }}
                search
                modalTitle="Select Voice"
                selected={voice}
                data={languageList?.[lang] ?? []}
                labelExtractor={(item) => item.identifier}
                placeholder="Select Voice"
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
                    label="Test"
                    variant="secondary"
                    onPress={() => {
                        if (voice === undefined) {
                            Logger.warnToast(`No Speaker Chosen`)
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
