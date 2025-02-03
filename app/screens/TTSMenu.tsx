import ThemedButton from '@components/buttons/ThemedButton'
import DropdownSheet from '@components/input/DropdownSheet'
import ThemedSwitch from '@components/input/ThemedSwitch'
import ThemedTextInput from '@components/input/ThemedTextInput'
import SectionTitle from '@components/text/SectionTitle'
import HeaderTitle from '@components/views/HeaderTitle'
import { Theme } from '@lib/theme/ThemeManager'
import { Global, Logger } from '@lib/utils/Global'
import * as Speech from 'expo-speech'
import { useEffect, useState } from 'react'
import { View } from 'react-native'
import { useMMKVBoolean, useMMKVObject } from 'react-native-mmkv'

function groupBy(array: any[], key: string) {
    if (array.length === 0) return []
    return array.reduce((result, obj) => {
        const keyValue = obj[key]
        if (!result[keyValue]) {
            result[keyValue] = []
        }
        result[keyValue].push(obj)
        return result
    }, {})
}

type LanguageListItem = {
    [key: string]: Speech.Voice[]
}

const TTSMenu = () => {
    const { color } = Theme.useTheme()
    const [currentSpeaker, setCurrentSpeaker] = useMMKVObject<Speech.Voice>(Global.TTSSpeaker)
    const [enableTTS, setEnableTTS] = useMMKVBoolean(Global.TTSEnable)
    const [autoTTS, setAutoTTS] = useMMKVBoolean(Global.TTSAuto)
    const [lang, setLang] = useState(currentSpeaker?.language ?? 'en-US')
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

    return (
        <View
            style={{
                flex: 1,
                marginVertical: 16,
                paddingVertical: 16,
                paddingHorizontal: 16,
                rowGap: 8,
            }}>
            <HeaderTitle title="TTS" />

            <SectionTitle>Settings</SectionTitle>

            <ThemedSwitch
                label="Enable"
                value={enableTTS}
                onValueChange={(value) => {
                    if (value) {
                        getVoices(true)
                    } else Speech.stop()
                    setEnableTTS(value)
                }}
            />

            <ThemedSwitch
                value={autoTTS}
                onValueChange={setAutoTTS}
                label="Automatically TTS On Inference"
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
                Speaker ({modelList.filter((item) => item.language === lang).length})
            </SectionTitle>

            <DropdownSheet
                style={{ marginBottom: 8 }}
                search
                modalTitle="Select Speaker"
                selected={currentSpeaker}
                data={languageList?.[lang] ?? []}
                labelExtractor={(item) => item.identifier}
                placeholder="Select Speaker"
                onChangeValue={(item) => setCurrentSpeaker(item)}
            />
            <View style={{ flexDirection: 'row', alignItems: 'center', columnGap: 16 }}>
                <ThemedTextInput
                    value={testAudioText}
                    onChangeText={setTestAudioText}
                    style={{ color: color.text._400, fontStyle: 'italic', flex: 1 }}
                />
                <ThemedButton
                    label="Test"
                    variant="secondary"
                    onPress={() => {
                        if (currentSpeaker === undefined) {
                            Logger.log(`No Speaker Chosen`, true)
                            return
                        }
                        Speech.speak(testAudioText, {
                            language: currentSpeaker.language,
                            voice: currentSpeaker.identifier,
                        })
                    }}
                />
            </View>
        </View>
    )
}

export default TTSMenu
