import { useLiveQuery } from 'drizzle-orm/expo-sqlite'
import { useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import { Text, View } from 'react-native'
import { KeyboardAwareScrollView } from 'react-native-keyboard-controller'
import Markdown from 'react-native-markdown-display'
import { useMMKVBoolean } from 'react-native-mmkv'
import { SafeAreaView } from 'react-native-safe-area-context'
import { useShallow } from 'zustand/react/shallow'

import ThemedButton from '@components/buttons/ThemedButton'
import DropdownSheet from '@components/input/DropdownSheet'
import StringArrayEditor from '@components/input/StringArrayEditor'
import ThemedCheckbox from '@components/input/ThemedCheckbox'
import ThemedSwitch from '@components/input/ThemedSwitch'
import ThemedTextInput from '@components/input/ThemedTextInput'
import SectionTitle from '@components/text/SectionTitle'
import Accordion from '@components/views/Accordion'
import Alert from '@components/views/Alert'
import { useBottomSheetRef } from '@components/views/BottomSheet'
import ContextMenu from '@components/views/ContextMenu'
import { Grid } from '@components/views/Grid'
import HeaderButton from '@components/views/HeaderButton'
import HeaderTitle from '@components/views/HeaderTitle'
import InputSheet from '@components/views/InputSheet'
import { AppSettings } from '@lib/constants/GlobalValues'
import useAutosave from '@lib/hooks/AutoSave'
import { useCompletionMode } from '@lib/hooks/CompletionMode'
import { useTextFilterStore } from '@lib/hooks/TextFilter'
import { MarkdownStyle } from '@lib/markdown/Markdown'
import { useAppMode } from '@lib/state/AppMode'
import { Instructs, InstructType } from '@lib/state/Instructs'
import { Logger } from '@lib/state/Logger'
import { Theme } from '@lib/theme/ThemeManager'
import { saveStringToDownload } from '@lib/utils/File'
import { snakeToCamel } from '@lib/utils/TextFormat'
import { KeysOfType } from '@lib/utils/Types'

const affixKeys: KeysOfType<InstructType, string>[] = [
    'system_prefix',
    'system_suffix',
    'input_prefix',
    'input_suffix',
    'output_prefix',
    'output_suffix',
    'last_output_prefix',
]

const macroCardKeys: KeysOfType<InstructType, boolean>[] = [
    'wrap',
    'examples',
    'scenario',
    'names',
    'timestamp',
    'personality',
    'hide_think_tags',
]

const attachmentKeys: KeysOfType<InstructType, boolean>[] = [
    'send_images',
    'send_audio',
    'send_documents',
    'last_image_only',
]

const FormattingManager = () => {
    const { t } = useTranslation()
    const markdownStyle = MarkdownStyle.useMarkdownStyle()
    const autoformatterData = useMemo(
        () => [
            {
                label: t('formatting.autoformatter.disabled'),
                example: t('formatting.autoformatter.disabledExample'),
            },
            {
                label: t('formatting.autoformatter.plainActionQuoteSpeech'),
                example: t('formatting.autoformatter.plainActionQuoteSpeechExample'),
            },
            {
                label: t('formatting.autoformatter.asteriskActionPlainSpeech'),
                example: t('formatting.autoformatter.asteriskActionPlainSpeechExample'),
            },
            {
                label: t('formatting.autoformatter.asteriskActionQuoteSpeech'),
                example: t('formatting.autoformatter.asteriskActionQuoteSpeechExample'),
            },
        ],
        [t]
    )
    const completionType = useCompletionMode()
    const { appMode } = useAppMode()
    const [useTemplate, setUseTemplate] = useMMKVBoolean(AppSettings.UseModelTemplate)
    const { currentInstruct, loadInstruct, setCurrentInstruct } = Instructs.useInstruct(
        useShallow((state) => ({
            currentInstruct: state.data,
            loadInstruct: state.load,
            setCurrentInstruct: state.setData,
        }))
    )
    const instructID = currentInstruct?.id
    const { color, spacing, borderRadius } = Theme.useTheme()
    const { data } = useLiveQuery(Instructs.db.query.instructListQuery())
    const instructList = data
    const selectedItem = data.filter((item) => item.id === instructID)?.[0]
    const newInstructInputRef = useBottomSheetRef()
    const { textFilter, setTextFilter, sendFilteredText, setSendFilteredText } = useTextFilterStore(
        useShallow((state) => ({
            sendFilteredText: state.sendFilteredText,
            setSendFilteredText: state.setSendFilteredText,
            textFilter: state.filter,
            setTextFilter: state.setFilter,
        }))
    )

    const handleSaveInstruct = (log: boolean) => {
        if (currentInstruct && instructID)
            Instructs.db.mutate.updateInstruct(instructID, currentInstruct)
    }

    const handleRegenerateDefaults = () => {
        Alert.alert({
            title: t('formatting.alert.regenerateDefaults.title'),
            description: t('formatting.alert.regenerateDefaults.description'),
            buttons: [
                { label: t('formatting.alert.regenerateDefaults.cancel') },
                {
                    label: t('formatting.alert.regenerateDefaults.confirm'),
                    onPress: async () => {
                        await Instructs.generateInitialDefaults()
                    },
                },
            ],
        })
    }

    const handleExportPreset = async () => {
        if (!instructID) return
        const name =
            (currentInstruct?.name ?? t('formatting.defaultName')) + t('formatting.jsonExtension')
        await saveStringToDownload(JSON.stringify(currentInstruct), name, 'utf8')
        Logger.infoToast(t('formatting.toast.savedToDownloads', { name }))
    }

    const handleDeletePreset = () => {
        if (instructList.length === 1) {
            Logger.warnToast(t('formatting.toast.cannotDeleteLastPreset'))
            return
        }

        Alert.alert({
            title: t('formatting.alert.deleteConfig.title'),
            description: t('formatting.alert.deleteConfig.description', {
                name: currentInstruct?.name ?? t('formatting.defaultName'),
            }),
            buttons: [
                { label: t('formatting.alert.deleteConfig.cancel') },
                {
                    label: t('formatting.alert.deleteConfig.confirm'),
                    onPress: async () => {
                        if (!instructID) return
                        const leftover = data.filter((item) => item.id !== instructID)
                        if (leftover.length === 0) {
                            Logger.warnToast(t('formatting.toast.cannotDeleteLastPreset'))
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
        <ContextMenu
            triggerIcon="setting"
            triggerIconSize={24}
            placement="bottom"
            buttons={[
                {
                    label: t('formatting.createConfig'),
                    icon: 'file-add',
                    onPress: (close) => {
                        newInstructInputRef.current?.open()
                        close()
                    },
                },
                {
                    label: t('formatting.exportConfig'),
                    icon: 'download',
                    onPress: (close) => {
                        handleExportPreset()
                        close()
                    },
                },
                {
                    label: t('formatting.deleteConfig'),
                    icon: 'delete',
                    onPress: (close) => {
                        handleDeletePreset()
                        close()
                    },
                    variant: 'warning',
                },
                {
                    label: t('formatting.regenerateDefaults'),
                    icon: 'reload',
                    onPress: (close) => {
                        handleRegenerateDefaults()
                        close()
                    },
                },
            ]}
        />
    )

    useAutosave({ data: currentInstruct, onSave: () => handleSaveInstruct(false), interval: 1000 })

    if (!currentInstruct) return

    const handleUpdateInstructText = (key: KeysOfType<InstructType, string>, value: string) => {
        setCurrentInstruct({ ...currentInstruct, [key]: value })
    }

    const handleUpdateInstructBoolean = (
        key: KeysOfType<InstructType, boolean>,
        value: boolean
    ) => {
        setCurrentInstruct({ ...currentInstruct, [key]: value })
    }

    const AffixGrid = () => (
        <Grid
            items={affixKeys}
            numColumns={2}
            rowGap={8}
            columnGap={8}
            renderItem={(item) => {
                return (
                    <ThemedTextInput
                        label={t('formatting.sections.' + snakeToCamel(item))}
                        value={currentInstruct[item]}
                        onChangeText={(text) => {
                            handleUpdateInstructText(item, text)
                        }}
                        numberOfLines={5}
                        multiline
                    />
                )
            }}
        />
    )

    return (
        <SafeAreaView
            edges={['bottom']}
            key={currentInstruct.id}
            style={{
                marginVertical: spacing.xl,
                flex: 1,
            }}>
            <HeaderTitle title={t('formatting.title')} />
            <HeaderButton headerRight={headerRight} />
            <InputSheet
                title={t('formatting.newPreset')}
                ref={newInstructInputRef}
                verifyText={(text) =>
                    instructList.some((item) => item.name === text)
                        ? t('formatting.configExists')
                        : ''
                }
                onConfirm={(text) => {
                    if (instructList.some((item) => item.name === text)) {
                        Logger.warnToast(t('formatting.toast.configNameExists'))
                        return
                    }
                    if (!currentInstruct) return

                    Instructs.db.mutate
                        .createInstruct({ ...currentInstruct, name: text })
                        .then(async (newid) => {
                            Logger.infoToast(t('formatting.toast.configCreated'))
                            await loadInstruct(newid)
                        })
                }}
            />

            <KeyboardAwareScrollView
                showsVerticalScrollIndicator={false}
                style={{
                    flex: 1,
                    marginTop: 16,
                }}
                contentContainerStyle={{
                    rowGap: spacing.xl,
                    paddingHorizontal: spacing.xl,
                }}>
                <View
                    style={{
                        marginTop: spacing.xl,
                        paddingBottom: spacing.l,
                        flexDirection: 'row',
                        alignItems: 'center',
                        columnGap: spacing.m,
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
                        modalTitle={t('formatting.selectConfig')}
                        search
                    />
                    <ThemedButton iconName="save" iconSize={28} variant="tertiary" />
                </View>
                <SectionTitle>{t('instruct.formatting')}</SectionTitle>
                <ThemedTextInput
                    label={t('formatting.sections.systemPrompt')}
                    value={currentInstruct.system_prompt}
                    onChangeText={(text) => {
                        handleUpdateInstructText('system_prompt', text)
                    }}
                    numberOfLines={5}
                    multiline
                />

                <ThemedTextInput
                    label={t('formatting.sections.systemPromptFormat')}
                    value={currentInstruct.system_prompt_format}
                    onChangeText={(text) => {
                        handleUpdateInstructText('system_prompt_format', text)
                    }}
                    numberOfLines={3}
                    multiline
                />

                {completionType === 'chatCompletions' ? (
                    <Accordion
                        label={t('formatting.unused', {
                            mode:
                                appMode === 'local'
                                    ? t('common.labels.model')
                                    : t('common.labels.api'),
                        })}>
                        {AffixGrid()}
                    </Accordion>
                ) : (
                    AffixGrid()
                )}

                <StringArrayEditor
                    containerStyle={{}}
                    label={t('formatting.sections.stopSequence')}
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
                    replaceNewLine={String.fromCharCode(10)}
                />

                <ThemedCheckbox
                    label={t('formatting.sections.useCommonStopSequences')}
                    value={currentInstruct.use_common_stop}
                    onChangeValue={(b) => {
                        setCurrentInstruct({
                            ...currentInstruct,
                            use_common_stop: b,
                        })
                    }}
                />

                <SectionTitle>{t('instruct.macros')}</SectionTitle>

                <Grid
                    items={macroCardKeys}
                    numColumns={2}
                    columnGap={8}
                    renderItem={(item) => {
                        return (
                            <ThemedCheckbox
                                label={t('formatting.sections.' + snakeToCamel(item))}
                                value={currentInstruct[item]}
                                onChangeValue={(b) => {
                                    handleUpdateInstructBoolean(item, b)
                                }}
                            />
                        )
                    }}
                />

                <SectionTitle>{t('instruct.attachments')}</SectionTitle>
                <Grid
                    items={attachmentKeys}
                    numColumns={2}
                    columnGap={8}
                    renderItem={(item) => {
                        return (
                            <ThemedCheckbox
                                label={t('formatting.sections.' + snakeToCamel(item))}
                                value={currentInstruct[item]}
                                onChangeValue={(b) => {
                                    handleUpdateInstructBoolean(item, b)
                                }}
                            />
                        )
                    }}
                />

                <View style={{ rowGap: 8 }}>
                    <SectionTitle>{t('instruct.textformatter.title')}</SectionTitle>
                    <Text
                        style={{
                            color: color.text._400,
                        }}>
                        {t('instruct.textformatter.description')}:
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

                <SectionTitle>{t('instruct.hiddentext.title')}</SectionTitle>
                <Text
                    style={{
                        color: color.text._400,
                    }}>
                    {t('instruct.hiddentext.description')}
                </Text>

                <StringArrayEditor value={textFilter} setValue={setTextFilter} />

                <ThemedSwitch
                    label={t('instruct.filteredtext.label')}
                    description={t('instruct.filteredtext.description')}
                    value={sendFilteredText}
                    onChangeValue={setSendFilteredText}
                />

                <SectionTitle>{t('instruct.localtemplate.title')}</SectionTitle>

                <ThemedSwitch
                    label={t('instruct.localtemplate.label')}
                    description={t('instruct.localtemplate.description')}
                    value={useTemplate}
                    onChangeValue={setUseTemplate}
                />
            </KeyboardAwareScrollView>
        </SafeAreaView>
    )
}

export default FormattingManager
