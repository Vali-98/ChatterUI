import { useLiveQuery } from 'drizzle-orm/expo-sqlite'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { View } from 'react-native'
import { FlatList } from 'react-native-gesture-handler'
import { SafeAreaView } from 'react-native-safe-area-context'
import { create } from 'zustand'

import LongButton from '@components/buttons/LongButton'
import ThemedSlider from '@components/input/ThemedSlider'
import ThemedSwitch from '@components/input/ThemedSwitch'
import ThemedTextInput from '@components/input/ThemedTextInput'
import SectionTitle from '@components/text/SectionTitle'
import TText from '@components/text/TText'
import Accordion from '@components/views/Accordion'
import HeaderTitle from '@components/views/HeaderTitle'
import { LorebookType } from '@db/schema'
import { useDebounce } from '@lib/hooks/Debounce'
import { useLiveQueryJoined } from '@lib/hooks/LiveQueryJoined'
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
    const { data: entries } = useLiveQuery(
        Lorebooks.db.live.lorebookEntryNameList(id ?? -1, search),
        [search]
    )
    const [placeholderInfo, setPlaceholderInfo] = useState<LorebookType | undefined>(undefined)
    const openEditor = useLorebookEntryEditorState((state) => state.open)
    useLiveQueryJoined(Lorebooks.db.live.lorebookInfo(id ?? -1), [id], {
        onUpdated: (result) => {
            if (result) setPlaceholderInfo(result)
        },
    })

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
                    {/**
                         
                    <ThemedSwitch
                        label="Enable"
                        value={placeholderInfo?.active ?? false}
                        onChangeValue={(active) => {
                            handleUpdate({ active })
                        }}
                    />
                    
                         */}
                    <ThemedSlider
                        label={t('lorebook.fields.tokenBudget')}
                        value={placeholderInfo?.token_budget ?? 0}
                        min={1}
                        max={128000}
                        onValueChange={(token_budget) => handleUpdate({ token_budget })}
                    />
                    <ThemedSwitch
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
            <ThemedTextInput
                containerStyle={{ flex: 0, paddingHorizontal: 12 }}
                placeholder={t('common.actions.search')}
                value={search}
                onChangeText={setSearch}
            />
            <FlatList
                style={{ paddingHorizontal: 12 }}
                data={entries}
                contentContainerStyle={{ rowGap: 4, paddingBottom: 64 }}
                keyExtractor={(item) => item.id.toString()}
                renderItem={({ item }) => (
                    <LongButton active={false} onPress={() => openEditor(item.id)}>
                        <TText>{item.name}</TText>
                    </LongButton>
                )}
            />
            <LorebookEntryEditor />
        </SafeAreaView>
    )
}

export default LorebookInfoScreen
