import Alert from '@components/Alert'
import CheckboxTitle from '@components/CheckboxTitle'
import DropdownSheet from '@components/DropdownSheet'
import FadeDownView from '@components/FadeDownView'
import PopupMenu from '@components/PopupMenu'
import SliderInput from '@components/SliderInput'
import StringArrayEditor from '@components/StringArrayEditor'
import TextBox from '@components/TextBox'
import TextBoxModal from '@components/TextBoxModal'
import useAutosave from '@constants/AutoSave'
import { FontAwesome } from '@expo/vector-icons'
import { Instructs, Logger, MarkdownStyle, Style, saveStringToDownload } from '@globals'
import { useLiveQuery } from 'drizzle-orm/expo-sqlite'
import { Stack } from 'expo-router'
import { useState } from 'react'
import { View, SafeAreaView, TouchableOpacity, StyleSheet, ScrollView, Text } from 'react-native'
import Markdown from 'react-native-markdown-display'

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

    const handleRegenerateDefaults = () => {
        Alert.alert({
            title: `Regenerate Default Instructs`,
            description: `Are you sure you want to regenerate default Instructs'?`,
            buttons: [
                { label: 'Cancel' },
                {
                    label: 'Regenerate Default Presets',
                    onPress: async () => {
                        await Instructs.generateInitialDefaults()
                    },
                },
            ],
        })
    }

    const handleExportPreset = async () => {
        if (!instructID) return
        const name = (currentInstruct?.name ?? 'Default') + '.json'
        await saveStringToDownload(JSON.stringify(currentInstruct), name, 'utf8')
        Logger.log(`Saved "${name}" to Downloads`, true)
    }

    const handleDeletePreset = () => {
        if (instructList.length === 1) {
            Logger.log(`Cannot delete last Instruct preset.`, true)
            return
        }

        Alert.alert({
            title: `Delete Preset`,
            description: `Are you sure you want to delete '${currentInstruct?.name}'?`,
            buttons: [
                { label: 'Cancel' },
                {
                    label: 'Delete Instruct',
                    onPress: async () => {
                        if (!instructID) return
                        const leftover = data.filter((item) => item.id !== instructID)
                        if (leftover.length === 0) {
                            Logger.log('Cannot delete last instruct', true)
                            return
                        }
                        Instructs.db.mutate.deleteInstruct(instructID)
                        loadInstruct(leftover[0].id)
                    },
                    type: 'warning',
                },
            ],
        })
    }

    const headerRight = () => (
        <PopupMenu
            icon="setting"
            iconSize={24}
            placement="bottom"
            options={[
                {
                    label: 'Create Preset',
                    icon: 'addfile',
                    onPress: (menu) => {
                        setShowNewInstruct(true)

                        menu.current?.close()
                    },
                },
                {
                    label: 'Export Preset',
                    icon: 'download',
                    onPress: (menu) => {
                        handleExportPreset()
                        menu.current?.close()
                    },
                },
                {
                    label: 'Delete Preset',
                    icon: 'delete',
                    onPress: (menu) => {
                        handleDeletePreset()
                        menu.current?.close()
                    },
                    warning: true,
                },
                {
                    label: 'Regenerate Default',
                    icon: 'reload1',
                    onPress: (menu) => {
                        handleRegenerateDefaults()
                        menu.current?.close()
                    },
                },
            ]}
        />
    )

    useAutosave({ data: currentInstruct, onSave: () => handleSaveInstruct(false), interval: 3000 })

    if (currentInstruct)
        return (
            <FadeDownView style={{ flex: 1 }}>
                <SafeAreaView style={styles.mainContainer}>
                    <Stack.Screen
                        options={{
                            title: `Instruct`,
                            animation: 'fade',
                            headerRight: headerRight,
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
                        <DropdownSheet
                            selected={selectedItem}
                            data={instructList}
                            labelExtractor={(item) => item.name}
                            onChangeValue={(item) => {
                                if (item.id === instructID) return
                                loadInstruct(item.id)
                            }}
                            modalTitle="Select Preset"
                            search
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
                    </View>

                    <ScrollView showsVerticalScrollIndicator={false} style={styles.scrollContainer}>
                        <TextBox
                            name="System Sequence"
                            varname="system_prompt"
                            lines={5}
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

                        <StringArrayEditor
                            style={{ marginBottom: 12 }}
                            title="Stop Sequence"
                            value={
                                currentInstruct.stop_sequence
                                    ? currentInstruct.stop_sequence.split(',')
                                    : []
                            }
                            setValue={(data) => {
                                setCurrentInstruct({
                                    ...currentInstruct,
                                    stop_sequence: data.join(','),
                                })
                            }}
                            replaceNewLine="\n"
                        />

                        <View
                            style={{
                                flexDirection: 'row',
                                columnGap: 16,
                                marginBottom: 16,
                                justifyContent: 'space-evenly',
                            }}>
                            <View>
                                <CheckboxTitle
                                    name="Wrap In Newline"
                                    value={currentInstruct.wrap}
                                    onChangeValue={(b) => {
                                        setCurrentInstruct({
                                            ...currentInstruct,
                                            wrap: b,
                                        })
                                    }}
                                />
                                <CheckboxTitle
                                    name="Include Names"
                                    value={currentInstruct.names}
                                    onChangeValue={(b) => {
                                        setCurrentInstruct({
                                            ...currentInstruct,
                                            names: b,
                                        })
                                    }}
                                />
                                <CheckboxTitle
                                    name="Add Timestamp"
                                    value={currentInstruct.timestamp}
                                    onChangeValue={(b) => {
                                        setCurrentInstruct({
                                            ...currentInstruct,
                                            timestamp: b,
                                        })
                                    }}
                                />
                            </View>
                            <View>
                                <CheckboxTitle
                                    name="Use Examples"
                                    value={currentInstruct.examples}
                                    onChangeValue={(b) => {
                                        setCurrentInstruct({
                                            ...currentInstruct,
                                            examples: b,
                                        })
                                    }}
                                />
                                <CheckboxTitle
                                    name="Use Scenario"
                                    value={currentInstruct.scenario}
                                    onChangeValue={(b) => {
                                        setCurrentInstruct({
                                            ...currentInstruct,
                                            scenario: b,
                                        })
                                    }}
                                />

                                <CheckboxTitle
                                    name="Use Personality"
                                    value={currentInstruct.personality}
                                    onChangeValue={(b) => {
                                        setCurrentInstruct({
                                            ...currentInstruct,
                                            personality: b,
                                        })
                                    }}
                                />
                            </View>
                        </View>

                        <SliderInput
                            label="Autoformat New Chats"
                            value={currentInstruct.format_type}
                            onValueChange={(value) =>
                                setCurrentInstruct({ ...currentInstruct, format_type: value })
                            }
                            min={0}
                            max={3}
                            step={1}
                            showInput={false}
                        />
                        <Text style={{ color: Style.getColor('primary-text2'), marginLeft: 16 }}>
                            Mode: {currentInstruct.format_type} -
                            {' ' +
                                [
                                    'Autoformatting Disabled',
                                    'Plain Action, Quote Speech',
                                    'Asterisk Action, Plain Speech',
                                    'Asterisk Action, Quote Speech',
                                ][currentInstruct.format_type]}
                        </Text>
                        <Text
                            style={{
                                color: Style.getColor('primary-text2'),
                                marginLeft: 16,
                                marginTop: 8,
                            }}>
                            Example:
                        </Text>
                        <View style={styles.exampleContainer}>
                            <Markdown
                                markdownit={MarkdownStyle.Rules}
                                rules={MarkdownStyle.RenderRules}
                                style={MarkdownStyle.Styles}>
                                {
                                    [
                                        '*<No Formatting>*',
                                        'Some action, "Some speech"',
                                        '*Some action* Some speech',
                                        '*Some action* "Some speech"',
                                    ][currentInstruct.format_type]
                                }
                            </Markdown>
                        </View>
                        {/* @TODO: Macros are always replaced - people may want this to be changed
                            <CheckboxTitle
                                name="Replace Macro In Sequences"
                                varname="macro"
                                body={currentInstruct}
                                setValue={setCurrentInstruct}
                            />
                            */}

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
                    </ScrollView>
                </SafeAreaView>
            </FadeDownView>
        )
}

export default Instruct

const styles = StyleSheet.create({
    mainContainer: {
        marginVertical: 16,
        flex: 1,
    },

    dropdownContainer: {
        paddingHorizontal: 20,
        marginTop: 16,
        flexDirection: 'row',
        paddingBottom: 12,
        alignItems: 'center',
    },

    scrollContainer: {
        flex: 1,
        paddingHorizontal: 20,
        marginTop: 16,
    },

    selected: {
        color: Style.getColor('primary-text1'),
    },

    button: {
        padding: 5,
        borderRadius: 4,
        marginLeft: 8,
    },

    exampleContainer: {
        backgroundColor: Style.getColor('primary-surface2'),
        marginTop: 8,
        paddingHorizontal: 24,
        marginLeft: 16,
        borderRadius: 8,
    },
})
