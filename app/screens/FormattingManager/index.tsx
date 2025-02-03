import ThemedButton from '@components/buttons/ThemedButton'
import DropdownSheet from '@components/input/DropdownSheet'
import StringArrayEditor from '@components/input/StringArrayEditor'
import ThemedCheckbox from '@components/input/ThemedCheckbox'
import ThemedTextInput from '@components/input/ThemedTextInput'
import SectionTitle from '@components/text/SectionTitle'
import Alert from '@components/views/Alert'
import FadeDownView from '@components/views/FadeDownView'
import HeaderButton from '@components/views/HeaderButton'
import HeaderTitle from '@components/views/HeaderTitle'
import PopupMenu from '@components/views/PopupMenu'
import TextBoxModal from '@components/views/TextBoxModal'
import useAutosave from '@lib/hooks/AutoSave'
import { Theme } from '@lib/theme/ThemeManager'
import { Instructs, Logger, MarkdownStyle, saveStringToDownload } from '@lib/utils/Global'
import { useLiveQuery } from 'drizzle-orm/expo-sqlite'
import { useState } from 'react'
import { SafeAreaView, ScrollView, Text, View } from 'react-native'
import Markdown from 'react-native-markdown-display'

const autoformatterData = [
    { label: 'Disabled', example: '*<No Formatting>*' },
    { label: 'Plain Action, Quote Speech', example: 'Some action, "Some speech"' },
    { label: 'Asterisk Action, Plain Speech', example: '*Some action* Some speech' },
    { label: 'Asterisk Action, Quote Speech', example: '*Some action* "Some speech"' },
]

const FormattingManager = () => {
    const { currentInstruct, loadInstruct, setCurrentInstruct } = Instructs.useInstruct(
        (state) => ({
            currentInstruct: state.data,
            loadInstruct: state.load,
            setCurrentInstruct: state.setData,
        })
    )
    const instructID = currentInstruct?.id
    const { color, spacing, borderRadius } = Theme.useTheme()
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
                <SafeAreaView
                    style={{
                        marginVertical: spacing.xl,
                        flex: 1,
                    }}>
                    <HeaderTitle title="Formatting" />
                    <HeaderButton headerRight={headerRight} />
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

                    <View
                        style={{
                            paddingHorizontal: spacing.xl,
                            marginTop: spacing.xl,
                            paddingBottom: spacing.l,
                            flexDirection: 'row',
                            alignItems: 'center',
                        }}>
                        <DropdownSheet
                            containerStyle={{ flex: 1 }}
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
                        <ThemedButton iconName="save" iconSize={28} variant="tertiary" />
                    </View>

                    <ScrollView
                        showsVerticalScrollIndicator={false}
                        style={{
                            flex: 1,
                            marginTop: 16,
                        }}
                        contentContainerStyle={{
                            rowGap: spacing.xl,
                            paddingHorizontal: spacing.xl,
                        }}>
                        <SectionTitle>Instruct Formatting</SectionTitle>
                        <ThemedTextInput
                            label="System Sequence"
                            value={currentInstruct.system_prompt}
                            onChangeText={(text) => {
                                setCurrentInstruct({
                                    ...currentInstruct,
                                    system_prompt: text,
                                })
                            }}
                            numberOfLines={5}
                            multiline
                        />
                        <View style={{ flexDirection: 'row', columnGap: spacing.m }}>
                            <ThemedTextInput
                                label="System Prefix"
                                value={currentInstruct.system_prefix}
                                onChangeText={(text) => {
                                    setCurrentInstruct({
                                        ...currentInstruct,
                                        system_prefix: text,
                                    })
                                }}
                                numberOfLines={5}
                                multiline
                            />
                            <ThemedTextInput
                                label="System Suffix"
                                value={currentInstruct.system_suffix}
                                onChangeText={(text) => {
                                    setCurrentInstruct({
                                        ...currentInstruct,
                                        system_suffix: text,
                                    })
                                }}
                                numberOfLines={5}
                                multiline
                            />
                        </View>
                        <View style={{ flexDirection: 'row', columnGap: spacing.m }}>
                            <ThemedTextInput
                                label="Input Prefix"
                                value={currentInstruct.input_prefix}
                                onChangeText={(text) => {
                                    setCurrentInstruct({
                                        ...currentInstruct,
                                        input_prefix: text,
                                    })
                                }}
                                numberOfLines={5}
                                multiline
                            />
                            <ThemedTextInput
                                label="Input Suffix"
                                value={currentInstruct.input_suffix}
                                onChangeText={(text) => {
                                    setCurrentInstruct({
                                        ...currentInstruct,
                                        input_suffix: text,
                                    })
                                }}
                                numberOfLines={5}
                                multiline
                            />
                        </View>
                        <View style={{ flexDirection: 'row', columnGap: spacing.m }}>
                            <ThemedTextInput
                                label="Output Prefix"
                                value={currentInstruct.output_prefix}
                                onChangeText={(text) => {
                                    setCurrentInstruct({
                                        ...currentInstruct,
                                        output_prefix: text,
                                    })
                                }}
                                numberOfLines={5}
                                multiline
                            />
                            <ThemedTextInput
                                label="Output Suffix"
                                value={currentInstruct.output_suffix}
                                onChangeText={(text) => {
                                    setCurrentInstruct({
                                        ...currentInstruct,
                                        output_suffix: text,
                                    })
                                }}
                                numberOfLines={5}
                                multiline
                            />
                        </View>

                        <View style={{ flexDirection: 'row' }}>
                            <ThemedTextInput
                                label="Last Output Prefix"
                                value={currentInstruct.last_output_prefix}
                                onChangeText={(text) => {
                                    setCurrentInstruct({
                                        ...currentInstruct,
                                        last_output_prefix: text,
                                    })
                                }}
                                numberOfLines={5}
                                multiline
                            />
                        </View>

                        <StringArrayEditor
                            containerStyle={{ marginBottom: spacing.l }}
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

                        <SectionTitle>Macros & Character Card</SectionTitle>

                        <View
                            style={{
                                flexDirection: 'row',
                                columnGap: spacing.xl,
                                justifyContent: 'space-around',
                            }}>
                            <View>
                                <ThemedCheckbox
                                    name="Wrap In Newline"
                                    value={currentInstruct.wrap}
                                    onChangeValue={(b) => {
                                        setCurrentInstruct({
                                            ...currentInstruct,
                                            wrap: b,
                                        })
                                    }}
                                />
                                <ThemedCheckbox
                                    name="Include Names"
                                    value={currentInstruct.names}
                                    onChangeValue={(b) => {
                                        setCurrentInstruct({
                                            ...currentInstruct,
                                            names: b,
                                        })
                                    }}
                                />
                                <ThemedCheckbox
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
                                <ThemedCheckbox
                                    name="Use Examples"
                                    value={currentInstruct.examples}
                                    onChangeValue={(b) => {
                                        setCurrentInstruct({
                                            ...currentInstruct,
                                            examples: b,
                                        })
                                    }}
                                />
                                <ThemedCheckbox
                                    name="Use Scenario"
                                    value={currentInstruct.scenario}
                                    onChangeValue={(b) => {
                                        setCurrentInstruct({
                                            ...currentInstruct,
                                            scenario: b,
                                        })
                                    }}
                                />

                                <ThemedCheckbox
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

                        <View style={{ rowGap: 8 }}>
                            <SectionTitle>Text Formatter</SectionTitle>
                            <Text
                                style={{
                                    color: color.text._400,
                                }}>
                                Automatically formats first message to the style below:
                            </Text>
                            <View
                                style={{
                                    backgroundColor: color.neutral._300,
                                    marginTop: spacing.m,
                                    paddingHorizontal: spacing.xl2,
                                    alignItems: 'center',
                                    borderRadius: borderRadius.m,
                                }}>
                                <Markdown
                                    markdownit={MarkdownStyle.Rules}
                                    rules={MarkdownStyle.RenderRules}
                                    style={MarkdownStyle.Styles}>
                                    {autoformatterData[currentInstruct.format_type].example}
                                </Markdown>
                            </View>
                            <View>
                                {autoformatterData.map((item, index) => (
                                    <ThemedCheckbox
                                        key={item.label}
                                        name={item.label}
                                        value={currentInstruct.format_type === index}
                                        onChangeValue={(b) => {
                                            if (b)
                                                setCurrentInstruct({
                                                    ...currentInstruct,
                                                    format_type: index,
                                                })
                                        }}
                                    />
                                ))}
                            </View>
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

export default FormattingManager
