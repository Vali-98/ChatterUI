import { useCallback, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { ScrollView, View } from 'react-native'
import { create } from 'zustand'
import { useShallow } from 'zustand/react/shallow'

import ThemedButton from '@components/buttons/ThemedButton'
import StringArrayEditor from '@components/input/StringArrayEditor'
import ThemedSlider from '@components/input/ThemedSlider'
import ThemedSwitch from '@components/input/ThemedSwitch'
import ThemedTextInput from '@components/input/ThemedTextInput'
import Alert from '@components/views/Alert'
import BottomSheet, { BottomSheetRef, createBottomSheetRef } from '@components/views/BottomSheet'
import { LorebookEntryType } from '@db/schema'
import { useLiveQueryJoined } from '@lib/hooks/LiveQueryJoined'
import { Lorebooks } from '@lib/state/lorebooks'
import { Theme } from '@lib/theme/ThemeManager'

type LorebookEntryEditorStateProps = {
    ref: BottomSheetRef | null
    entryId?: number

    open: (entryId: number) => void
    close: () => void
}

export const useLorebookEntryEditorState = create<LorebookEntryEditorStateProps>()((set, get) => ({
    ref: createBottomSheetRef(),

    entryId: undefined,

    open: (entryId) => {
        set({ entryId })
        get().ref?.current?.open()
    },

    close: () => {
        get().ref?.current?.close()
        set({ entryId: undefined })
    },
}))

const LorebookEntryEditor = () => {
    const { t } = useTranslation()
    const { spacing } = Theme.useTheme()

    const { close, entryId, ref } = useLorebookEntryEditorState(useShallow((state) => state))

    const [placeholderEntry, setPlaceholderEntry] = useState<LorebookEntryType | undefined>(
        undefined
    )
    const [edited, setEdited] = useState(false)

    const handleSetPlaceholder = useCallback((entry: LorebookEntryType, isEdited = true) => {
        setPlaceholderEntry(entry)
        setEdited(isEdited)
    }, [])

    const { data: entry } = useLiveQueryJoined(
        Lorebooks.db.live.lorebookEntry(entryId ?? -1),
        [entryId ?? -1],
        {
            targets: [
                {
                    tableName: 'lorebook_entries',
                    rowId: entryId ?? -1,
                },
            ],
            onUpdated: (result) => {
                const item = result

                if (item) {
                    setPlaceholderEntry(item)
                }
            },
        }
    )

    const backAction = useCallback(
        (closeSheet: () => void) => {
            if (!entry || !placeholderEntry || !edited) {
                return closeSheet()
            }

            Alert.alert({
                title: t('common.alert.unsaved.title'),
                description: t('common.alert.unsaved.description'),
                buttons: [
                    {
                        label: t('common.actions.cancel'),
                    },
                    {
                        label: t('common.actions.discardChanges'),
                        onPress: closeSheet,
                        type: 'warning',
                    },
                    {
                        label: t('common.actions.save'),
                        onPress: async () => {
                            await Lorebooks.db.mutate.updateLorebookEntry(entry.id, {
                                name: placeholderEntry.name,
                                content: placeholderEntry.content,
                                keys: placeholderEntry.keys,
                                secondary_keys: placeholderEntry.secondary_keys,
                                enable: placeholderEntry.enable,
                                insertion_order: placeholderEntry.insertion_order,
                                case_sensitive: placeholderEntry.case_sensitive,
                                priority: placeholderEntry.priority,
                                selective: placeholderEntry.selective,
                                constant: placeholderEntry.constant,
                                comment: placeholderEntry.comment,
                            })

                            closeSheet()
                        },
                    },
                ],
            })

            return true
        },
        [entry, placeholderEntry, edited, t]
    )

    if (entry === undefined || placeholderEntry === undefined || !entryId) {
        return
    }

    const updateEntry = <K extends keyof LorebookEntryType>(
        key: K,
        value: LorebookEntryType[K]
    ) => {
        handleSetPlaceholder({
            ...placeholderEntry,
            [key]: value,
        })
    }

    const save = async () => {
        await Lorebooks.db.mutate.updateLorebookEntry(entry.id, placeholderEntry)

        close()
    }

    return (
        <BottomSheet onRequestClose={backAction} sheetStyle={{ flex: 1 }} ref={ref}>
            <ScrollView
                showsVerticalScrollIndicator={false}
                contentContainerStyle={{
                    rowGap: spacing.xl,
                    paddingBottom: spacing.xl2,
                }}>
                <ThemedTextInput
                    label={t('common.labels.name')}
                    containerStyle={{ flex: 0 }}
                    value={placeholderEntry.name}
                    onChangeText={(value) => updateEntry('name', value)}
                />

                <StringArrayEditor
                    label={t('lorebook.fields.keys')}
                    value={placeholderEntry.keys}
                    setValue={(value) => updateEntry('keys', value)}
                />

                <ThemedTextInput
                    label={t('common.labels.content')}
                    containerStyle={{ flex: 0 }}
                    numberOfLines={10}
                    value={placeholderEntry.content}
                    onChangeText={(value) => updateEntry('content', value)}
                />

                <ThemedTextInput
                    label={t('common.labels.comment')}
                    containerStyle={{ flex: 0 }}
                    numberOfLines={3}
                    value={placeholderEntry.comment}
                    onChangeText={(value) => updateEntry('comment', value)}
                />

                <ThemedSwitch
                    label={t('common.actions.enable')}
                    value={placeholderEntry.enable}
                    onChangeValue={(value) => updateEntry('enable', value)}
                />

                <ThemedSwitch
                    label={t('lorebook.fields.caseSensitive')}
                    value={placeholderEntry.case_sensitive}
                    onChangeValue={(value) => updateEntry('case_sensitive', value)}
                />

                <ThemedSwitch
                    label={t('lorebook.fields.selective')}
                    value={placeholderEntry.selective}
                    onChangeValue={(value) => updateEntry('selective', value)}
                />

                {placeholderEntry.selective && (
                    <StringArrayEditor
                        label={t('lorebook.fields.secondaryKeys')}
                        value={placeholderEntry.secondary_keys}
                        setValue={(value) => updateEntry('secondary_keys', value)}
                    />
                )}

                <ThemedSwitch
                    label={t('lorebook.fields.constant')}
                    value={placeholderEntry.constant}
                    onChangeValue={(value) => updateEntry('constant', value)}
                />

                <ThemedSlider
                    label={t('lorebook.fields.insertionOrder')}
                    min={0}
                    max={1000}
                    step={1}
                    value={placeholderEntry.insertion_order}
                    onValueChange={(value) => updateEntry('insertion_order', value)}
                />

                <ThemedSlider
                    label={t('lorebook.fields.priority')}
                    min={0}
                    max={1000}
                    step={1}
                    value={placeholderEntry.priority}
                    onValueChange={(value) => updateEntry('priority', value)}
                />
            </ScrollView>

            <View
                style={{
                    flexDirection: 'row',
                    columnGap: spacing.l,
                    justifyContent: 'space-between',
                    marginTop: 8,
                }}>
                <ThemedButton
                    label={t('common.actions.delete')}
                    variant="critical"
                    iconName="delete"
                    onPress={() => {
                        Alert.alert({
                            title: t('lorebook.deleteEntry.title'),
                            description: t('lorebook.deleteEntry.description', {
                                name: entry.name,
                            }),
                            buttons: [
                                {
                                    label: t('common.actions.cancel'),
                                },
                                {
                                    label: t('common.actions.delete'),
                                    onPress: async () => {
                                        await Lorebooks.db.mutate.deleteLorebookEntry(entry.id)
                                        close()
                                    },
                                    type: 'warning',
                                },
                            ],
                        })
                    }}
                />

                <ThemedButton
                    label={t('common.actions.reset')}
                    variant="tertiary"
                    iconName="reload"
                    onPress={() => {
                        handleSetPlaceholder(entry, false)
                    }}
                />

                <ThemedButton
                    label={t('common.actions.save')}
                    variant="secondary"
                    iconName="save"
                    onPress={save}
                />
            </View>
        </BottomSheet>
    )
}

export default LorebookEntryEditor
