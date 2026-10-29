import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { View } from 'react-native'
import { FlatList } from 'react-native-gesture-handler'
import { SafeAreaView } from 'react-native-safe-area-context'
import { create } from 'zustand'

import IconButton from '@components/buttons/IconButton'
import ListButton from '@components/buttons/ListButton'
import ThemedSlider from '@components/input/ThemedSlider'
import ThemedSwitchRow from '@components/input/ThemedSwitchRow'
import ThemedTextInput from '@components/input/ThemedTextInput'
import SectionTitle from '@components/text/SectionTitle'
import TText from '@components/text/TText'
import Accordion from '@components/views/Accordion'
import HeaderTitle from '@components/views/HeaderTitle'
import { LorebookType } from '@db/schema'
import { useDebounce } from '@lib/hooks/Debounce'
import { useLiveQueryAsync } from '@lib/hooks/liveQuery'
import { Lorebooks } from '@lib/state/lorebooks'

import LorebookEntryEditor, { useLorebookEntryEditorState } from './LorebookEntryEditor'

type LorebookInfoState = {
    id?: number
    setId: (id: number) => void
}

export const useLorebookInfoState = create<LorebookInfoState>()((set) => ({
    setId: (id) => set({ id }),
}))

const LorebookInfoScreen = () => {
    const { t } = useTranslation()
    const [search, setSearch] = useState('')
    const { id } = useLorebookInfoState()
    const { data: entries } = useLiveQueryAsync(
        Lorebooks.db.live.lorebookEntryNameList(id ?? -1, search),
        { key: ['lorebook-entry-names', id, search], watch: [{ table: 'lorebook_entries' }] }
    )
    const [placeholderInfo, setPlaceholderInfo] = useState<LorebookType | undefined>(undefined)
    const openEditor = useLorebookEntryEditorState((state) => state.open)
    const { data: info } = useLiveQueryAsync(Lorebooks.db.live.lorebookInfo(id ?? -1), {
        keepPreviousData: false,
        key: ['lorebook-info', id],
        watch: [{ table: 'lorebooks', rowId: id ?? -1 }],
        enabled: id !== undefined,
    })
    useEffect(() => {
        // Refresh the local draft when its saved database record changes.
        // eslint-disable-next-line react-hooks/set-state-in-effect
        if (info) setPlaceholderInfo(info)
    }, [info])

    const handleUpdateDebounce = useDebounce(
        async (lorebookInfo: LorebookType | Partial<LorebookType>) => {
            if (!id) return
            await Lorebooks.db.mutate.updateLorebookInfo(id, lorebookInfo)
        },
        300
    )

    const handleUpdate = async (lorebookInfo: LorebookType | Partial<LorebookType>) => {
        if (placeholderInfo) {
            setPlaceholderInfo({ ...placeholderInfo, ...lorebookInfo })
        }
        handleUpdateDebounce(lorebookInfo)
    }

    return (
        <SafeAreaView style={{ flex: 1, rowGap: 16 }}>
            <HeaderTitle title={t('lorebook.labels.info')} />

            <View
                style={{
                    paddingHorizontal: 12,
                    rowGap: 8,
                }}>
                <Accordion
                    label={t('lorebook.labels.generationSettings')}
                    bodyStyle={{ rowGap: 8, paddingBottom: 24 }}>
                    <ThemedTextInput
                        containerStyle={{ flex: 0 }}
                        label={t('common.labels.name')}
                        value={placeholderInfo?.name ?? ''}
                        onChangeText={(name) => handleUpdate({ name })}
                    />
                    <ThemedTextInput
                        multiline
                        numberOfLines={4}
                        containerStyle={{ flex: 0 }}
                        label={t('common.labels.description')}
                        value={placeholderInfo?.description ?? ''}
                        onChangeText={(description) => handleUpdate({ description })}
                    />

                    <ThemedSlider
                        label={t('lorebook.fields.tokenBudget')}
                        value={placeholderInfo?.token_budget ?? 0}
                        min={1}
                        max={128000}
                        onValueChange={(token_budget) => handleUpdate({ token_budget })}
                    />
                    <ThemedSwitchRow
                        label={t('lorebook.fields.recursiveScanning')}
                        value={placeholderInfo?.recursive_scanning ?? false}
                        onChangeValue={(recursive_scanning) => handleUpdate({ recursive_scanning })}
                    />
                    <ThemedSlider
                        label={t('lorebook.fields.scanDepth')}
                        value={placeholderInfo?.scan_depth ?? 0}
                        min={0}
                        max={100}
                        onValueChange={(scan_depth) => handleUpdate({ scan_depth })}
                    />
                </Accordion>
            </View>
            <SectionTitle style={{ marginHorizontal: 12, paddingTop: 16, paddingBottom: 8 }}>
                {t('lorebook.fields.entries')}
            </SectionTitle>
            <View
                style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    paddingHorizontal: 12,
                    columnGap: 8,
                }}>
                <ThemedTextInput
                    containerStyle={{}}
                    placeholder={t('common.actions.search')}
                    value={search}
                    onChangeText={setSearch}
                />

                <IconButton
                    variant="secondary"
                    viewStyle={{ flex: 0, paddingHorizontal: 8 }}
                    iconName="plus"
                    onPress={async () => {
                        if (!id) return
                        const entryId = await Lorebooks.db.mutate.createLorebookEntry(
                            t('lorebook.new.entry'),
                            id
                        )
                        openEditor(entryId)
                    }}
                />
            </View>

            <FlatList
                style={{ paddingHorizontal: 12 }}
                data={entries}
                contentContainerStyle={{ rowGap: 4, paddingBottom: 64 }}
                keyExtractor={(item) => item.id.toString()}
                renderItem={({ item }) => (
                    <ListButton
                        style={{ padding: 12 }}
                        active={false}
                        onPress={() => openEditor(item.id)}>
                        <TText>{item.name}</TText>
                    </ListButton>
                )}
            />
            <LorebookEntryEditor />
        </SafeAreaView>
    )
}

export default LorebookInfoScreen
