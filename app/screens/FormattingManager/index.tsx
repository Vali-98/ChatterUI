import ThemedButton from '@components/buttons/ThemedButton'
import DropdownSheet from '@components/input/DropdownSheet'
import StringArrayEditor from '@components/input/StringArrayEditor'
import ThemedCheckbox from '@components/input/ThemedCheckbox'
import ThemedSwitch from '@components/input/ThemedSwitch'
import ThemedTextInput from '@components/input/ThemedTextInput'
import SectionTitle from '@components/text/SectionTitle'
import Alert from '@components/views/Alert'
import FadeDownView from '@components/views/FadeDownView'
import HeaderButton from '@components/views/HeaderButton'
import HeaderTitle from '@components/views/HeaderTitle'
import PopupMenu from '@components/views/PopupMenu'
import TextBoxModal from '@components/views/TextBoxModal'
import { AppSettings } from '@lib/constants/GlobalValues'
import useAutosave from '@lib/hooks/AutoSave'
import { useTextFilterState } from '@lib/hooks/TextFilter'
import { MarkdownStyle } from '@lib/markdown/Markdown'
import { Instructs } from '@lib/state/Instructs'
import { Logger } from '@lib/state/Logger'
import { Theme } from '@lib/theme/ThemeManager'
import { saveStringToDownload } from '@lib/utils/File'
import { useLiveQuery } from 'drizzle-orm/expo-sqlite'
import { useState } from 'react'
import { SafeAreaView, ScrollView, Text, View } from 'react-native'
import Markdown from 'react-native-markdown-display'
import { useMMKVBoolean } from 'react-native-mmkv'

const autoformatterData = [
    { label: 'Disabled', example: '*<No Formatting>*' },
    { label: 'Plain Action, Quote Speech', example: 'Some action, "Some speech"' },
    { label: 'Asterisk Action, Plain Speech', example: '*Some action* Some speech' },
    { label: 'Asterisk Action, Quote Speech', example: '*Some action* "Some speech"' },
]

const FormattingManager = () => {
    const markdownStyle = MarkdownStyle.useMarkdownStyle()
    const [useTemplate, setUseTemplate] = useMMKVBoolean(AppSettings.UseModelTemplate)
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
    const { textFilter, setTextFilter } = useTextFilterState((state) => ({
        textFilter: state.filter,
        setTextFilter: state.setFilter,
    }))

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
        Logger.infoToast(`Saved "${name}" to Downloads`)
    }

    const handleDeletePreset = () => {
        if (instructList.length === 1) {
            Logger.warnToast(`Cannot delete last Instruct preset.`)
            return
        }

        Alert.alert({
            title: `Delete Config`,
            description: `Are you sure you want to delete '${currentInstruct?.name}'?`,
            buttons: [
                { label: 'Cancel' },
                {
                    label: 'Delete Instruct',
                    onPress: async () => {
                        if (!instructID) return
                        const leftover = data.filter((item) => item.id !== instructID)
                        if (leftover.length === 0) {
                            Logger.warnToast('Cannot delete last instruct')
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
                    label: 'Create Config',
                    icon: 'addfile',
                    onPress: (menu) => {
                        setShowNewInstruct(true)

                        menu.current?.close()
                    },
                },
                {
                    label: 'Export Config',
                    icon: 'download',
                    onPress: (menu) => {
                        handleExportPreset()
                        menu.current?.close()
                    },
                },
                {
                    label: 'Delete Config',
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
                    <View>
                        <TextBoxModal
                            booleans={[showNewInstruct, setShowNewInstruct]}
                            onConfirm={(text) => {
                                if (instructList.some((item) => item.name === text)) {
                                    Logger.warnToast(`Config name already exists.`)
                                    return
                                }
                                if (!currentInstruct) return

                                Instructs.db.mutate
                                    .createInstruct({ ...currentInstruct, name: text })
                                    .then(async (newid) => {
                                        Logger.infoToast(`Config created.`)
                                        await loadInstruct(newid)
                                    })
                            }}
                        />
                    </View>

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
                            modalTitle="Select Config"
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
                            label="Stop Sequence"
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
                                    label="Wrap In Newline"
                                    value={currentInstruct.wrap}
                                    onChangeValue={(b) => {
                                        setCurrentInstruct({
                                            ...currentInstruct,
                                            wrap: b,
                                        })
                                    }}
                                />
                                <ThemedCheckbox
                                    label="Include Names"
                                    value={currentInstruct.names}
                                    onChangeValue={(b) => {
                                        setCurrentInstruct({
                                            ...currentInstruct,
                                            names: b,
                                        })
                                    }}
                                />
                                <ThemedCheckbox
                                    label="Add Timestamp"
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
                                    label="Use Examples"
                                    value={currentInstruct.examples}
                                    onChangeValue={(b) => {
                                        setCurrentInstruct({
                                            ...currentInstruct,
                                            examples: b,
                                        })
                                    }}
                                />
                                <ThemedCheckbox
                                    label="Use Scenario"
                                    value={currentInstruct.scenario}
                                    onChangeValue={(b) => {
                                        setCurrentInstruct({
                                            ...currentInstruct,
                                            scenario: b,
                                        })
                                    }}
                                />

                                <ThemedCheckbox
                                    label="Use Personality"
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
                                    style={markdownStyle}>
                                    {autoformatterData[currentInstruct.format_type].example}
                                </Markdown>
                            </View>
                            <View>
                                {autoformatterData.map((item, index) => (
                                    <ThemedCheckbox
                                        key={item.label}
                                        label={item.label}
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

                        <SectionTitle>Hidden Text</SectionTitle>
                        <Text
                            style={{
                                color: color.text._400,
                            }}>
                            Hides text that matches regex patterns defined below. (case insensitive)
                        </Text>

                        <StringArrayEditor value={textFilter} setValue={setTextFilter} />

                        <SectionTitle>Local Template</SectionTitle>

                        <ThemedSwitch
                            label="Use Built-In Local Model Template"
                            description="When in Local Mode, ChatterUI automatically uses the instruct template provided by the loaded model. Disable this if you want messages to be formatted using Instruct instead. System Prompt however is always used."
                            value={useTemplate}
                            onChangeValue={setUseTemplate}
                        />

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
