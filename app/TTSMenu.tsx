import AnimatedView from '@components/AnimatedView'
import { FontAwesome } from '@expo/vector-icons'
import { Global, Color, Logger } from '@globals'
import { Stack } from 'expo-router'
import * as Speech from 'expo-speech'
import { useEffect, useState } from 'react'
import { StyleSheet, Text, TouchableOpacity, View, Switch } from 'react-native'
import { Dropdown } from 'react-native-element-dropdown'
import { useMMKVBoolean, useMMKVObject } from 'react-native-mmkv'

function groupBy(array: Array<any>, key: string) {
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
    [key: string]: Array<Speech.Voice>
}

const TTSMenu = () => {
    const [currentSpeaker, setCurrentSpeaker] = useMMKVObject<Speech.Voice>(Global.TTSSpeaker)
    const [enableTTS, setEnableTTS] = useMMKVBoolean(Global.TTSEnable)
    const [autoTTS, setAutoTTS] = useMMKVBoolean(Global.TTSAuto)
    const [lang, setLang] = useState(currentSpeaker?.language ?? 'en-US')
    const [modelList, setModelList] = useState<Array<Speech.Voice>>([])
    const languageList: LanguageListItem = groupBy(modelList, 'language')

    const languages = Object.keys(languageList)
        .sort()
        .map((name) => {
            return { name }
        })

    useEffect(() => {
        getVoices()
    }, [])

    const getVoices = (value = false) => {
        if (enableTTS || value)
            Speech.getAvailableVoicesAsync().then((list) => setModelList((current) => list))
    }

    return (
        <AnimatedView dy={200} tduration={500} fade={0} fduration={500} style={{ flex: 1 }}>
            <View style={styles.mainContainer}>
                <Stack.Screen options={{ title: 'TTS', animation: 'fade' }} />
                <View style={styles.enableContainer}>
                    <Text style={{ ...styles.title }}>Enable</Text>
                    <Switch
                        trackColor={{ false: Color.Offwhite, true: '#f4f3f4' }}
                        thumbColor={enableTTS ? '#f4f3f4' : Color.Offwhite}
                        ios_backgroundColor="#3e3e3e"
                        onValueChange={(value) => {
                            if (value) {
                                getVoices(true)
                            } else Speech.stop()
                            setEnableTTS(value)
                        }}
                        value={enableTTS}
                    />
                </View>
                {enableTTS && (
                    <View>
                        <View style={styles.enableContainer}>
                            <Text style={{ ...styles.title }}>Automatically TTS On Inference</Text>
                            <Switch
                                trackColor={{ false: Color.Offwhite, true: '#f4f3f4' }}
                                thumbColor={enableTTS ? '#f4f3f4' : Color.Offwhite}
                                ios_backgroundColor="#3e3e3e"
                                onValueChange={(value) => {
                                    setAutoTTS(value)
                                }}
                                value={autoTTS}
                            />
                        </View>
                        <Text style={{ ...styles.title, marginTop: 8 }}>Language</Text>
                        <Text style={styles.subtitle}>
                            Languages: {Object.keys(languageList).length}
                        </Text>
                        <View style={{ marginTop: 8 }}>
                            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                                <Dropdown
                                    value={lang}
                                    style={{ ...styles.dropdownbox, flex: 1 }}
                                    selectedTextStyle={styles.selected}
                                    data={languages}
                                    labelField="name"
                                    valueField="name"
                                    containerStyle={styles.dropdownbox}
                                    itemTextStyle={{ color: Color.Text }}
                                    itemContainerStyle={{
                                        backgroundColor: Color.DarkContainer,
                                        borderRadius: 8,
                                    }}
                                    activeColor={Color.Container}
                                    placeholderStyle={styles.selected}
                                    placeholder="Select Language"
                                    onChange={(item) => setLang(item.name)}
                                />
                                <TouchableOpacity
                                    style={{ ...styles.button, marginLeft: 8 }}
                                    onPress={() => getVoices()}>
                                    <FontAwesome name="refresh" size={20} color={Color.White} />
                                </TouchableOpacity>
                            </View>
                        </View>

                        <Text style={{ ...styles.title, marginTop: 8 }}>Speaker</Text>
                        <Text style={styles.subtitle}>
                            Speakers: {modelList.filter((item) => item.language === lang).length}
                        </Text>

                        <View style={{ marginTop: 8, marginBottom: 16 }}>
                            {modelList.length !== 0 && (
                                <Dropdown
                                    value={currentSpeaker?.identifier ?? ''}
                                    style={styles.dropdownbox}
                                    selectedTextStyle={styles.selected}
                                    data={languageList[lang]}
                                    labelField={'identifier'}
                                    valueField={'name'}
                                    containerStyle={styles.dropdownbox}
                                    itemTextStyle={{ color: Color.Text }}
                                    itemContainerStyle={{
                                        backgroundColor: Color.DarkContainer,
                                        borderRadius: 8,
                                    }}
                                    activeColor={Color.Container}
                                    placeholderStyle={styles.selected}
                                    placeholder="Select Speaker"
                                    onChange={(item) => setCurrentSpeaker(item)}
                                />
                            )}
                        </View>
                        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                            <TouchableOpacity
                                onPress={() => {
                                    if (currentSpeaker === undefined) {
                                        Logger.log(`No Speaker Chosen`, true)
                                        return
                                    }
                                    Speech.speak('This is a test audio.', {
                                        language: currentSpeaker.language,
                                        voice: currentSpeaker.identifier,
                                    })
                                }}
                                style={{ ...styles.button, padding: 8, marginRight: 16 }}>
                                <Text style={styles.buttonlabel}>Test</Text>
                            </TouchableOpacity>
                            <Text style={styles.subtitle}>"This is a test audio."</Text>
                        </View>
                    </View>
                )}
            </View>
        </AnimatedView>
    )
}

export default TTSMenu

const styles = StyleSheet.create({
    mainContainer: {
        marginVertical: 16,
        paddingVertical: 16,
        paddingHorizontal: 20,
    },

    title: {
        color: Color.Text,
        fontSize: 16,
    },

    subtitle: {
        color: Color.Offwhite,
    },

    buttonlabel: {
        color: Color.Text,
        fontSize: 16,
    },

    input: {
        flex: 1,
        color: Color.Text,
        backgroundColor: Color.DarkContainer,
        paddingVertical: 4,
        paddingHorizontal: 8,
        marginVertical: 8,
        borderRadius: 8,
        marginRight: 8,
    },

    button: {
        padding: 6,
        backgroundColor: Color.DarkContainer,
        borderRadius: 4,
    },

    textbutton: {
        padding: 8,
        backgroundColor: Color.DarkContainer,
        borderRadius: 4,
    },

    dropdownContainer: {
        marginTop: 16,
    },

    dropdownbox: {
        paddingHorizontal: 8,
        paddingVertical: 2,
        marginVertical: 8,
        backgroundColor: Color.DarkContainer,
        borderRadius: 8,
    },

    selected: {
        color: Color.Text,
    },

    enableContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 20,
        justifyContent: 'space-between',
        backgroundColor: Color.Container,
        borderRadius: 16,
        padding: 16,
    },
})
