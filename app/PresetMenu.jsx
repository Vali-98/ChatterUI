import { TextBoxModal, SliderItem, TextBox, CheckboxTitle } from '@components'
import AnimatedView from '@components/AnimatedView'
import { FontAwesome } from '@expo/vector-icons'
import { Global, Presets, saveStringExternal, Logger, Style } from '@globals'
import { Stack } from 'expo-router'
import { useState, useEffect } from 'react'
import {
    View,
    Text,
    StyleSheet,
    SafeAreaView,
    ScrollView,
    TouchableOpacity,
    Alert,
} from 'react-native'
import { Dropdown } from 'react-native-element-dropdown'
import { useMMKVObject, useMMKVString } from 'react-native-mmkv'

const SLIDER = 'slider'
const CHECKBOX = 'checbox'
const TEXTBOX = 'textbox'

const PresetMenu = () => {
    const [APIType, setAPIType] = useMMKVString(Global.APIType)
    const [presetName, setPresetName] = useMMKVString(Global.PresetName)
    const [currentPreset, setCurrentPreset] = useMMKVObject(Global.PresetData)
    const [presetList, setPresetList] = useState([])
    const [showNewPreset, setShowNewPreset] = useState(false)

    const presetData = {
        max_length: {
            type: SLIDER,
            data: { name: 'Context Size', step: 16, min: 1024, max: 32768 },
        },
        genamt: {
            type: SLIDER,
            data: { name: 'Generated Tokens', step: 16, min: 16, max: 8192 },
        },
        streaming: {
            type: CHECKBOX,
            data: { name: `Streaming (this doesn't do anything)` },
        },
        temp: {
            type: SLIDER,
            data: { name: 'Temperature', precision: 2, min: 0, max: 5 },
        },
        dynatemp_range: {
            type: SLIDER,
            data: { name: 'Temperature Range', precision: 2, min: 0, max: 5 },
        },
        rep_pen: {
            type: SLIDER,
            data: { name: 'Repetition Penalty', precision: 2, min: 1.0, max: 1.5 },
        },
        rep_pen_range: {
            type: SLIDER,
            data: { name: 'Repetition Penalty Range', min: 1, max: 4096 },
        },
        /*rep_pen_slope: {
            type: SLIDER,
            data: {
                name: 'Repetition Penalty Slope',
                precision: 1,
                min: 1.0,
                max: 10.0,
            },
        },*/
        encoder_rep_pen: {
            type: SLIDER,
            data: {
                name: 'Encoder Repetition Penalty',
                precision: 2,
                min: 0.8,
                max: 1.5,
            },
        },
        freq_pen: {
            type: SLIDER,
            data: { name: 'Frequency Penalty', precision: 2, min: -2, max: 2 },
        },
        presence_pen: {
            type: SLIDER,
            data: { name: 'Presence Penalty', precision: 2, min: -2, max: 2 },
        },
        no_repeat_ngram_size: {
            type: SLIDER,
            data: { name: 'No Repeat Ngram Size', min: 0, max: 20 },
        },
        min_length: {
            type: SLIDER,
            data: { name: 'Min Length', min: 0, max: 2000 },
        },
        top_p: {
            type: SLIDER,
            data: { name: 'Top P', precision: 2, min: 0, max: 1 },
        },
        top_a: {
            type: SLIDER,
            data: { name: 'Top A', precision: 2, min: 0, max: 1 },
        },
        top_k: { type: SLIDER, data: { name: 'Top K', min: 0, max: 100 } },
        min_p: {
            type: SLIDER,
            data: { name: 'Min P', precision: 2, step: 0.01, min: 0, max: 1 },
        },
        smoothing_factor: {
            type: SLIDER,
            data: { name: 'Smoothing Factor', precision: 2, min: 0, max: 10 },
        },
        typical: {
            type: SLIDER,
            data: { name: 'Typical Sampling', precision: 2, min: 0, max: 1 },
        },
        tfs: {
            type: SLIDER,
            data: { name: 'Tail-Free Sampling', precision: 2, min: 0, max: 1 },
        },
        epsilon_cutoff: {
            type: SLIDER,
            data: { name: 'Epsilon Cutoff', precision: 2, min: 0, max: 9 },
        },
        eta_cutoff: {
            type: SLIDER,
            data: { name: 'Eta Cutoff', precision: 2, min: 0, max: 20 },
        },
        mirostat_mode: {
            type: SLIDER,
            data: { name: 'Mirostat', step: 1, min: 0, max: 2 },
        },
        mirostat_tau: {
            type: SLIDER,
            data: { name: 'Mirostat Tau', precision: 2, min: 0, max: 20 },
        },
        mirostat_eta: {
            type: SLIDER,
            data: { name: 'Mirostat Eta', precision: 2, min: 0, max: 1 },
        },
        ban_eos_token: { type: CHECKBOX, data: { name: 'Ban EOS tokens' } },
        add_bos_token: { type: CHECKBOX, data: { name: 'Add BOS Token' } },
        do_sample: { type: CHECKBOX, data: { name: 'Do Sample' } },
        skip_special_tokens: {
            type: CHECKBOX,
            data: { name: 'Skip Special Token' },
        },
        grammar: { type: TEXTBOX, data: { name: 'Grammar', lines: 3 } },
        seed: { type: TEXTBOX, data: { name: 'Seed', keyboardType: 'number-pad' } },
        banned_tokens: { type: TEXTBOX, data: { name: 'Banned Tokens', lines: 3 } },
        guidance_scale: {
            type: SLIDER,
            data: { name: 'CFG Scale', precision: 2, min: 0.1, max: 4 },
        },
        negative_prompt: {
            type: TEXTBOX,
            data: { name: 'Negative Prompts', lines: 3 },
        },
        num_beams: {
            type: SLIDER,
            data: { name: 'Number of Beams', step: 1, min: 1, max: 20 },
        },
        length_penalty: {
            type: SLIDER,
            data: { name: 'Length Penalty', precision: 1, min: -5, max: 5 },
        },
        early_stopping: { type: CHECKBOX, data: { name: 'Early Stopping' } },
        penalty_alpha: {
            type: SLIDER,
            data: { name: 'Penalty Alpha', precision: 2, min: 0, max: 5 },
        },
    }

    const loadPresetList = (name) => {
        Presets.getFileList().then((list) => {
            const cleanlist = list.map((item) => {
                return item.replace(`.json`, '')
            })
            const mainlist = cleanlist.map((item) => {
                return { label: item }
            })
            setPresetList(mainlist)
            // after deletion, preset may not exist and needs to be changed
            if (cleanlist.includes(name)) return
            setPresetName(cleanlist[0])
            Presets.loadFile(cleanlist[0]).then((text) => setCurrentPreset(JSON.parse(text)))
        })
    }

    useEffect(() => {
        loadPresetList(presetName)
    }, [])

    return (
        <AnimatedView dy={200} tduration={500} fade={0} fduration={500} style={{ flex: 1 }}>
            <SafeAreaView>
                <TextBoxModal
                    booleans={[showNewPreset, setShowNewPreset]}
                    onConfirm={(text) => {
                        if (text === '') {
                            Logger.log(`Preset name cannot be empty`, true)
                            return
                        }

                        for (const item of presetList)
                            if (item.label === text) {
                                Logger.log(`Preset name already exists.`, true)
                                return
                            }

                        Presets.saveFile(text, currentPreset).then(() => {
                            Logger.log(`Preset created.`, true)
                            loadPresetList(text)
                            setPresetName((currentPreset) => text)
                        })
                    }}
                />

                <Stack.Screen
                    options={{
                        animation: 'fade',
                        title: `Sampler Settings`,
                    }}
                />

                <View style={styles.dropdownContainer}>
                    <Dropdown
                        value={presetName}
                        data={presetList}
                        valueField="label"
                        labelField="label"
                        onChange={(item) => {
                            if (item.label === presetName) return
                            setPresetName(item.label)
                            Presets.loadFile(item.label).then((preset) => {
                                setCurrentPreset(JSON.parse(preset))
                            })
                        }}
                        {...Style.drawer.default}
                    />
                    <TouchableOpacity
                        style={styles.button}
                        onPress={() => {
                            Presets.saveFile(presetName, currentPreset).then(
                                Logger.log(`Preset Updated!.`, true)
                            )
                        }}>
                        <FontAwesome
                            size={24}
                            name="save"
                            color={Style.getColor('primary-text1')}
                        />
                    </TouchableOpacity>

                    <TouchableOpacity
                        style={styles.button}
                        onPress={() => {
                            if (presetList.length === 1) {
                                Logger.log(`Cannot Delete Last Preset.`, true)
                                return
                            }
                            Alert.alert(
                                `Delete Preset`,
                                `Are you sure you want to delete '${presetName}'?`,
                                [
                                    { text: `Cancel`, style: `cancel` },
                                    {
                                        text: `Confirm`,
                                        style: `destructive`,
                                        onPress: () => {
                                            Presets.deleteFile(presetName).then(() => {
                                                loadPresetList()
                                            })
                                        },
                                    },
                                ]
                            )
                        }}>
                        <FontAwesome
                            size={24}
                            name="trash"
                            color={Style.getColor('primary-text1')}
                        />
                    </TouchableOpacity>

                    <TouchableOpacity
                        style={styles.button}
                        onPress={() => {
                            Presets.uploadFile().then((name) => {
                                if (name === undefined) {
                                    return
                                }
                                Presets.loadFile(name).then((preset) => {
                                    setCurrentPreset(JSON.parse(preset))
                                    setPresetName(name)
                                    loadPresetList(name)
                                })
                            })
                        }}>
                        <FontAwesome
                            size={24}
                            name="upload"
                            color={Style.getColor('primary-text1')}
                        />
                    </TouchableOpacity>

                    <TouchableOpacity
                        style={styles.button}
                        onPress={async () => {
                            saveStringExternal(`${presetName}.json`, JSON.stringify(currentPreset))
                        }}>
                        <FontAwesome
                            size={24}
                            name="download"
                            color={Style.getColor('primary-text1')}
                        />
                    </TouchableOpacity>

                    <TouchableOpacity
                        style={styles.button}
                        onPress={() => {
                            setShowNewPreset(true)
                        }}>
                        <FontAwesome
                            size={24}
                            name="plus"
                            color={Style.getColor('primary-text1')}
                        />
                    </TouchableOpacity>
                </View>

                <ScrollView>
                    <View style={styles.mainContainer}>
                        {Object.keys(presetData).map((item, index) => {
                            if (!Presets.APIFields[APIType].includes(item)) return
                            switch (presetData[item].type) {
                                case SLIDER:
                                    return (
                                        <SliderItem
                                            key={index}
                                            varname={item}
                                            body={currentPreset}
                                            setValue={setCurrentPreset}
                                            {...presetData[item].data}
                                        />
                                    )
                                case CHECKBOX:
                                    return (
                                        <CheckboxTitle
                                            key={index}
                                            varname={item}
                                            body={currentPreset}
                                            setValue={setCurrentPreset}
                                            {...presetData[item].data}
                                        />
                                    )
                                case TEXTBOX:
                                    return (
                                        <TextBox
                                            key={index}
                                            varname={item}
                                            body={currentPreset}
                                            setValue={setCurrentPreset}
                                            {...presetData[item].data}
                                        />
                                    )
                                default:
                                    return <Text>Something Went Wrong!</Text>
                            }
                        })}
                    </View>
                </ScrollView>
            </SafeAreaView>
        </AnimatedView>
    )
}

export default PresetMenu

const styles = StyleSheet.create({
    mainContainer: {
        margin: 16,
        paddingBottom: 150,
    },

    dropdownContainer: {
        marginHorizontal: 16,
        marginTop: 16,
        flexDirection: 'row',
        paddingBottom: 12,
        alignItems: 'center',
    },

    selected: {
        color: Style.getColor('primary-text1'),
    },

    selected: {
        color: Style.getColor('primary-text1'),
    },

    button: {
        padding: 5,
        borderRadius: 4,
        marginLeft: 8,
    },
})
