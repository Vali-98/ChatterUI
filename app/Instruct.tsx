import AnimatedView from '@components/AnimatedView'
import CheckboxTitle from '@components/CheckboxTitle'
import SliderItem from '@components/SliderItem'
import TextBox from '@components/TextBox'
import TextBoxModal from '@components/TextBoxModal'
import { FontAwesome } from '@expo/vector-icons'
import { Instructs, Logger, Style, saveStringToDownload } from '@globals'
import { useLiveQuery } from 'drizzle-orm/expo-sqlite'
import { Stack } from 'expo-router'
import { useState } from 'react'
import useAutosave from '@constants/AutoSave'
import {
    View,
    SafeAreaView,
    TouchableOpacity,
    StyleSheet,
    Alert,
    ScrollView,
    Text,
} from 'react-native'
import { Dropdown } from 'react-native-element-dropdown'
import { useMMKVNumber } from 'react-native-mmkv'

const Instruct = () => {
    const { currentInstruct, loadInstruct, setCurrentInstruct } = Instructs.useInstruct(
        (state) => ({
            currentInstruct: state.data,
            loadInstruct: state.load,
            setCurrentInstruct: state.setData,
        })
    )
    const instructID = currentInstruct?.id

    const { data } = useLiveQuery(Instructs.db.query.instructListQuery())
    const instructList = data
    const selectedItem = data.filter((item) => item.id === instructID)?.[0]
    const [showNewInstruct, setShowNewInstruct] = useState<boolean>(false)

    const handleSaveInstruct = (log: boolean) => {
        if (currentInstruct && instructID)
            Instructs.db.mutate.updateInstruct(instructID, currentInstruct)
    }

    const regenerateDefaults = () => {
        Alert.alert(
            `Regenerate Default Instructs`,
            `Are you sure you want to regenerate default Instructs'?`,
            [
                { text: `Cancel`, style: `cancel` },
                {
                    text: `Confirm`,
                    style: `destructive`,
                    onPress: async () => {
                        await Instructs.generateInitialDefaults()
                    },
                },
            ]
        )
    }

    useAutosave({ data: currentInstruct, onSave: () => handleSaveInstruct(false), interval: 3000 })

    if (currentInstruct)
        return (
            <AnimatedView dy={200} tduration={500} fade={0} fduration={500} style={{ flex: 1 }}>
                <SafeAreaView style={styles.mainContainer}>
                    <Stack.Screen
                        options={{
                            title: `Instruct`,
                            animation: 'fade',
                            headerRight: () => (
                                <TouchableOpacity
                                    style={{ paddingTop: 8, paddingRight: 8 }}
                                    onPress={regenerateDefaults}>
                                    <FontAwesome
                                        name="repeat"
                                        color={Style.getColor('primary-text1')}
                                        size={24}
                                    />
                                </TouchableOpacity>
                            ),
                        }}
                    />

                    <TextBoxModal
                        booleans={[showNewInstruct, setShowNewInstruct]}
                        onConfirm={(text) => {
                            if (instructList.some((item) => item.name === text)) {
                                Logger.log(`Preset name already exists.`, true)
                                return
                            }
                            if (!currentInstruct) return

                            Instructs.db.mutate
                                .createInstruct({ ...currentInstruct, name: text })
                                .then(async (newid) => {
                                    Logger.log(`Preset created.`, true)
                                    await loadInstruct(newid)
                                })
                        }}
                    />

                    <View style={styles.dropdownContainer}>
                        <Dropdown
                            value={selectedItem ?? ''}
                            data={instructList}
                            labelField="name"
                            valueField="id"
                            onChange={(item) => {
                                if (item.id === instructID) return
                                loadInstruct(item.id)
                            }}
                            {...Style.drawer.default}
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
                                    `Are you sure you want to delete  '${currentInstruct?.name}'?`,
                                    [
                                        { text: `Cancel`, style: `cancel` },
                                        {
                                            text: `Confirm`,
                                            style: `destructive`,
                                            onPress: () => {
                                                if (!instructID) return
                                                const leftover = data.filter(
                                                    (item) => item.id !== instructID
                                                )
                                                if (leftover.length === 0) {
                                                    Logger.log('Cannot delete last instruct', true)
                                                    return
                                                }
                                                Instructs.db.mutate.deleteInstruct(instructID)
                                                loadInstruct(leftover[0].id)
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
                                Logger.log('Not implemented', true)
                                //TODO: Import
                                /*Instructs.uploadFile().then((name) => {
                                if (name === undefined) {
                                    return
                                }
                                Instructs.loadFile(name).then((instruct) => {
                                    setCurrentInstruct(JSON.parse(instruct))
                                    setInstructName(name)
                                    loadInstructList(name)
                                })
                            })*/
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
                                if (instructID)
                                    saveStringToDownload(
                                        (currentInstruct?.name ?? 'Default') + '.json',
                                        JSON.stringify(currentInstruct),
                                        'utf8'
                                    )
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
                                    name="System Prefix"
                                    varname="system_prefix"
                                    body={currentInstruct}
                                    setValue={setCurrentInstruct}
                                    multiline
                                />
                                <TextBox
                                    name="System Suffix"
                                    varname="system_suffix"
                                    body={currentInstruct}
                                    setValue={setCurrentInstruct}
                                    multiline
                                />
                            </View>
                            <View style={{ flexDirection: 'row' }}>
                                <TextBox
                                    name="Input Prefix"
                                    varname="input_prefix"
                                    body={currentInstruct}
                                    setValue={setCurrentInstruct}
                                    multiline
                                />
                                <TextBox
                                    name="Input Suffix"
                                    varname="input_suffix"
                                    body={currentInstruct}
                                    setValue={setCurrentInstruct}
                                    multiline
                                />
                            </View>
                            <View style={{ flexDirection: 'row' }}>
                                <TextBox
                                    name="Output Prefix"
                                    varname="output_prefix"
                                    body={currentInstruct}
                                    setValue={setCurrentInstruct}
                                    multiline
                                />
                                <TextBox
                                    name="Output Suffix"
                                    varname="output_suffix"
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
                                    name="Last Output Prefix"
                                    varname="last_output_prefix"
                                    body={currentInstruct}
                                    setValue={setCurrentInstruct}
                                    multiline
                                />
                                {/*<TextBox
                                    name="Separator Sequence"
                                    varname="separator_sequence"
                                    body={currentInstruct}
                                    setValue={setCurrentInstruct}
                                    multiline
                                />*/}
                            </View>
                            <View style={{ flexDirection: 'row' }}>
                                <TextBox
                                    name="Stop Sequence"
                                    varname="stop_sequence"
                                    body={currentInstruct}
                                    setValue={setCurrentInstruct}
                                    multiline
                                />
                                {/*<TextBox
                                    name="Separator Sequence"
                                    varname="separator_sequence"
                                    body={currentInstruct}
                                    setValue={setCurrentInstruct}
                                    multiline
                                />*/}
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
                            {/* Activates Instruct when model is loaded with specific name that matches regex
                    
                            <TextBox
                                name="Activation Regex"
                                varname="activation_regex"
                                body={currentInstruct}
                                setValue={setCurrentInstruct}
                            />*/}
                            {/*    User Alignment Messages may be needed in future, might be removed on CCv3
                            <TextBox
                                name="User Alignment"
                                varname="user_alignment_message"
                                body={currentInstruct}
                                setValue={setCurrentInstruct}
                                multiline
                            />*/}
                            <CheckboxTitle
                                name="Use Examples"
                                varname="examples"
                                body={currentInstruct}
                                setValue={setCurrentInstruct}
                            />
                            <CheckboxTitle
                                name="Add Timestamp"
                                varname="timestamp"
                                body={currentInstruct}
                                setValue={setCurrentInstruct}
                            />
                            <SliderItem
                                name="Autoformat New Chats"
                                varname="format_type"
                                body={currentInstruct}
                                setValue={setCurrentInstruct}
                                min={0}
                                max={3}
                                step={1}
                                showInput={false}
                            />
                            <Text
                                style={{ color: Style.getColor('primary-text2'), marginLeft: 16 }}>
                                Mode: {currentInstruct.format_type} -
                                {' ' +
                                    [
                                        'Autoformatting Disabled',
                                        'Plain Action, Quote Speech',
                                        'Asterisk Action, Plain Speech',
                                        'Asterisk Action, Quote Speech',
                                    ][currentInstruct.format_type]}
                            </Text>
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

    selected: {
        color: Style.getColor('primary-text1'),
    },

    button: {
        padding: 5,
        borderRadius: 4,
        marginLeft: 8,
    },
})
