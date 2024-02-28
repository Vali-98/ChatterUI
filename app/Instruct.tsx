import CheckboxTitle from '@components/CheckboxTitle'
import TextBox from '@components/TextBox'
import TextBoxModal from '@components/TextBoxModal'
import { FontAwesome } from '@expo/vector-icons'
import { Global, Instructs, saveStringExternal, Logger, Style } from '@globals'
import { Stack } from 'expo-router'
import { useState, useEffect } from 'react'
import { View, SafeAreaView, TouchableOpacity, StyleSheet, Alert, ScrollView } from 'react-native'
import { Dropdown } from 'react-native-element-dropdown'
import { useMMKVObject, useMMKVString } from 'react-native-mmkv'
import { useAutosave } from 'react-autosave'
import { InstructType } from '@constants/Instructs'
import AnimatedView from '@components/AnimatedView'

type InstructListItem = {
    label: string
    value: number
}

const Instruct = () => {
    const [instructName, setInstructName] = useMMKVString(Global.InstructName)
    const [currentInstruct, setCurrentInstruct] = useMMKVObject<InstructType>(
        Global.CurrentInstruct
    )
    const [instructList, setInstructList] = useState<Array<InstructListItem>>([])
    const [selectedItem, setSelectedItem] = useState<InstructListItem | undefined>(undefined)
    const [showNewInstruct, setShowNewInstruct] = useState<boolean>(false)

    const loadInstructList = (name: string = '') => {
        Instructs.getFileList().then((list) => {
            const mainlist = list.map((item, index): InstructListItem => {
                return { label: item.replace(`.json`, ''), value: index }
            })
            setInstructList(mainlist)
            for (const item of mainlist) {
                if (item.label.replace(`.json`, '') === name) {
                    setSelectedItem(item)
                    return
                }
            }
            setSelectedItem(undefined)
            Instructs.loadFile(list[0].replace(`.json`, '')).then((instruct) => {
                setCurrentInstruct(JSON.parse(instruct))
            })
        })
    }

    useEffect(() => {
        if (instructName) loadInstructList(instructName)
    }, [])

    const handleSaveInstruct = (log: boolean) => {
        if (currentInstruct && instructName)
            Instructs.saveFile(instructName, currentInstruct).then(() =>
                Logger.log(`Instruct Updated!`, log)
            )
    }

    useAutosave({ data: currentInstruct, onSave: () => handleSaveInstruct(false), interval: 3000 })

    return (
        <AnimatedView dy={200} tduration={500} fade={0} fduration={500} style={{ flex: 1 }}>
            <SafeAreaView style={styles.mainContainer}>
                <Stack.Screen
                    options={{
                        title: `Instruct`,
                        animation: 'fade',
                    }}
                />

                <TextBoxModal
                    booleans={[showNewInstruct, setShowNewInstruct]}
                    onConfirm={(text) => {
                        if (instructList.some((item) => item.label === text)) {
                            Logger.log(`Preset name already exists.`, true)
                            return
                        }
                        if (!currentInstruct) return

                        Instructs.saveFile(text, { ...currentInstruct, name: text }).then(() => {
                            Logger.log(`Preset created.`, true)
                            setInstructName(text)
                            loadInstructList(text)
                        })
                    }}
                />

                <View style={styles.dropdownContainer}>
                    <Dropdown
                        value={selectedItem ?? ''}
                        style={styles.dropdownbox}
                        data={instructList}
                        selectedTextStyle={styles.selected}
                        labelField="label"
                        valueField="value"
                        onChange={(item) => {
                            if (item.label === instructName) return

                            setInstructName(item.label)
                            Instructs.loadFile(item.label).then((preset) => {
                                setCurrentInstruct(JSON.parse(preset))
                            })
                        }}
                        placeholderStyle={{ color: Style.getColor('primary-text2') }}
                        containerStyle={{ backgroundColor: Style.getColor('primary-surface2') }}
                        itemContainerStyle={{ backgroundColor: Style.getColor('primary-surface2') }}
                        itemTextStyle={{ color: Style.getColor('primary-text1') }}
                        activeColor={Style.getColor('primary-surface4')}
                    />
                    <TouchableOpacity
                        style={styles.button}
                        onPress={() => {
                            handleSaveInstruct(true)
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
                            if (instructList.length === 1) {
                                Logger.log(`Cannot delete last Instruct preset.`, true)
                                return
                            }
                            Alert.alert(
                                `Delete Preset`,
                                `Are you sure you want to delete  '${instructName}'?`,
                                [
                                    { text: `Cancel`, style: `cancel` },
                                    {
                                        text: `Confirm`,
                                        style: `destructive`,
                                        onPress: () => {
                                            if (!instructName) return
                                            Instructs.deleteFile(instructName).then(() => {
                                                loadInstructList()
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
                            Instructs.uploadFile().then((name) => {
                                if (name === undefined) {
                                    return
                                }
                                Instructs.loadFile(name).then((instruct) => {
                                    setCurrentInstruct(JSON.parse(instruct))
                                    setInstructName(name)
                                    loadInstructList(name)
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
                            if (instructName)
                                saveStringExternal(instructName, JSON.stringify(currentInstruct))
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
                            setShowNewInstruct(true)
                        }}>
                        <FontAwesome
                            size={24}
                            name="plus"
                            color={Style.getColor('primary-text1')}
                        />
                    </TouchableOpacity>
                </View>

                <ScrollView showsVerticalScrollIndicator={false}>
                    <View
                        style={{
                            paddingVertical: 20,
                        }}>
                        <TextBox
                            name="System Sequence"
                            varname="system_prompt"
                            lines={3}
                            body={currentInstruct}
                            setValue={setCurrentInstruct}
                            multiline
                        />

                        <View style={{ flexDirection: 'row' }}>
                            <TextBox
                                name="Input Sequence"
                                varname="input_sequence"
                                body={currentInstruct}
                                setValue={setCurrentInstruct}
                                multiline
                            />
                            <TextBox
                                name="Output Sequence"
                                varname="output_sequence"
                                body={currentInstruct}
                                setValue={setCurrentInstruct}
                                multiline
                            />
                        </View>

                        {/* Unused Sequences
                    <View style={{ flexDirection: 'row' }}>
                        <TextBox
                            name="First Output Sequence"
                            varname="first_output_sequence"
                            body={currentInstruct}
                            setValue={setCurrentInstruct}
                            multiline
                        />
                        <TextBox
                            name="Last Output Sequence"
                            varname="last_output_sequence"
                            body={currentInstruct}
                            setValue={setCurrentInstruct}
                            multiline
                        />
                    </View>
                    */}

                        <View style={{ flexDirection: 'row' }}>
                            <TextBox
                                name="System Sequence Prefix"
                                varname="system_sequence_prefix"
                                body={currentInstruct}
                                setValue={setCurrentInstruct}
                                multiline
                            />
                            <TextBox
                                name="System Sequence Suffix"
                                varname="system_sequence_suffix"
                                body={currentInstruct}
                                setValue={setCurrentInstruct}
                                multiline
                            />
                        </View>

                        <View style={{ flexDirection: 'row' }}>
                            <TextBox
                                name="Stop Sequence"
                                varname="stop_sequence"
                                body={currentInstruct}
                                setValue={setCurrentInstruct}
                                multiline
                            />
                            <TextBox
                                name="Separator Sequence"
                                varname="separator_sequence"
                                body={currentInstruct}
                                setValue={setCurrentInstruct}
                                multiline
                            />
                        </View>

                        <CheckboxTitle
                            name="Wrap Sequence with Newline"
                            varname="wrap"
                            body={currentInstruct}
                            setValue={setCurrentInstruct}
                        />

                        {/* @TODO: Macros are always replaced - people may want this to be changed
                    <CheckboxTitle
                        name="Replace Macro In Sequences"
                        varname="macro"
                        body={currentInstruct}
                        setValue={setCurrentInstruct}
                    />
                    */}

                        <CheckboxTitle
                            name="Include Names"
                            varname="names"
                            body={currentInstruct}
                            setValue={setCurrentInstruct}
                        />

                        {/*  Groups are not implemented - leftover from ST
                    <CheckboxTitle
                        name="Force for Groups and Personas"
                        varname="names_force_groups"
                        body={currentInstruct}
                        setValue={setCurrentInstruct}
                    />
                    */}

                        {/* Now idea what this does - leftover from ST
                    
                    <TextBox
                        name="Activation Regex"
                        varname="activation_regex"
                        body={currentInstruct}
                        setValue={setCurrentInstruct}
                />*/}
                    </View>
                </ScrollView>
            </SafeAreaView>
        </AnimatedView>
    )
}

export default Instruct

const styles = StyleSheet.create({
    mainContainer: {
        padding: 16,
        flex: 1,
    },

    dropdownContainer: {
        marginTop: 16,
        flexDirection: 'row',
        paddingBottom: 12,
        alignItems: 'center',
    },

    dropdownbox: {
        flex: 1,
        paddingHorizontal: 8,
        backgroundColor: Style.getColor('primary-surface3'),
        borderRadius: 8,
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
