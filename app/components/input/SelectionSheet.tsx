import { type ReactNode, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { TextInput, View, type StyleProp, type ViewStyle } from 'react-native'

import ListButton from '@components/buttons/ListButton'
import ThemedButton from '@components/buttons/ThemedButton'
import TText from '@components/text/TText'
import BottomSheet, { BottomSheetHeader, type BottomSheetRef } from '@components/views/BottomSheet'
import { Theme } from '@lib/theme/ThemeManager'
import { EdgeFadeFlatList } from '@components/views/EdgeFade'

export type SelectionKey = string | number
export type SelectionRow<T> = { item: T; selected: boolean; disabled: boolean; onPress: () => void }
type Renderer<T> = (row: SelectionRow<T>) => ReactNode
type Presentation<T> =
    | {
          labelExtractor: (item: T) => string
          renderItem?: Renderer<T>
          search?: boolean
          searchTextExtractor?: (item: T) => string
      }
    | ({ labelExtractor?: undefined; renderItem: Renderer<T> } & (
          | { search?: false; searchTextExtractor?: (item: T) => string }
          | { search: true; searchTextExtractor: (item: T) => string }
      ))
type Single<T> = {
    multiple?: false
    selectedKey: SelectionKey | null
    onSelect: (item: T) => void | Promise<void>
}
type Multiple<T> = {
    multiple: true
    selectedKeys: readonly SelectionKey[]
    onSelect: (items: T[]) => void | Promise<void>
    allowEmpty?: boolean
}
export type SelectionSheetProps<T> = Presentation<T> &
    (Single<T> | Multiple<T>) & {
        ref: BottomSheetRef
        items: T[]
        keyExtractor: (item: T) => SelectionKey
        title?: string
        confirmLabel?: string
        commitMode?: 'immediate' | 'confirm'
        closeOnSelect?: boolean
        sheetStyle?: StyleProp<ViewStyle>
        contentContainerStyle?: StyleProp<ViewStyle>
        onClose?: () => void
    }

const SelectionSheet = <T,>(props: SelectionSheetProps<T>) => {
    const { t } = useTranslation()
    const { color } = Theme.useTheme()
    const {
        ref,
        items,
        keyExtractor,
        labelExtractor,
        renderItem,
        title,
        confirmLabel,
        commitMode = 'immediate',
    } = props
    const [draft, setDraft] = useState<SelectionKey[]>([])
    const [filter, setFilter] = useState('')
    const [saving, setSaving] = useState(false)
    const [error, setError] = useState('')
    const committing = useRef(false)
    const getSearchText = props.searchTextExtractor ?? labelExtractor
    const filtered =
        props.search && filter
            ? items.filter((item) =>
                  getSearchText!(item).toLocaleLowerCase().includes(filter.toLocaleLowerCase())
              )
            : items
    const getSelection = (keys: SelectionKey[]) =>
        keys
            .map((key) => items.find((item) => keyExtractor(item) === key))
            .filter((item): item is T => item !== undefined)
    const selectedItems = getSelection(draft)
    const canConfirm = props.multiple
        ? props.allowEmpty !== false || selectedItems.length > 0
        : selectedItems.length === 1
    const commit = async (keys: SelectionKey[]) => {
        if (committing.current) return
        committing.current = true
        setSaving(true)
        setError('')
        try {
            const selection = getSelection(keys)
            if (props.multiple) await props.onSelect(selection)
            else if (selection[0] !== undefined) await props.onSelect(selection[0])
            if (commitMode === 'confirm' || (props.closeOnSelect ?? !props.multiple))
                ref.current?.close()
        } catch (cause) {
            if (commitMode === 'immediate') setDraft(draft)
            setError(cause instanceof Error ? cause.message : String(cause))
        } finally {
            committing.current = false
            setSaving(false)
        }
    }
    const select = (item: T) => {
        if (committing.current) return
        const key = keyExtractor(item)
        const next = props.multiple
            ? draft.includes(key)
                ? draft.filter((value) => value !== key)
                : [...draft, key]
            : commitMode === 'confirm' && draft.includes(key)
              ? []
              : [key]
        setDraft(next)
        if (commitMode === 'immediate') void commit(next)
    }
    return (
        <BottomSheet
            ref={ref}
            sheetStyle={[{ maxHeight: '80%' }, props.sheetStyle]}
            onOpen={() => {
                setDraft(
                    props.multiple
                        ? [...props.selectedKeys]
                        : props.selectedKey === null
                          ? []
                          : [props.selectedKey]
                )
                setFilter('')
                setError('')
            }}
            onClose={props.onClose}
            onRequestClose={saving ? () => {} : undefined}>
            <BottomSheetHeader
                title={title ?? t('common.actions.select')}
                style={{ paddingHorizontal: 16, paddingVertical: 16 }}>
                {props.search && (
                    <TextInput
                        value={filter}
                        onChangeText={setFilter}
                        editable={!saving}
                        placeholder={t('dropdown.filter')}
                        placeholderTextColor={color.text._400}
                        style={{
                            color: color.text._100,
                            backgroundColor: color.neutral._200,
                            borderRadius: 8,
                            paddingHorizontal: 12,
                            paddingVertical: 10,
                        }}
                    />
                )}
            </BottomSheetHeader>
            <EdgeFadeFlatList
                containerStyle={{ flexShrink: 1 }}
                data={filtered}
                keyExtractor={(item) => String(keyExtractor(item))}
                style={{ flexGrow: 0, flexShrink: 1 }}
                keyboardShouldPersistTaps="handled"
                contentContainerStyle={[
                    { paddingHorizontal: 16, paddingVertical: 4, rowGap: 8 },
                    props.contentContainerStyle,
                ]}
                extraData={{ draft, saving }}
                ListEmptyComponent={
                    <TText color="400" style={{ paddingVertical: 16 }}>
                        {t('common.emptyStates.noItems')}
                    </TText>
                }
                renderItem={({ item }) => {
                    const selected = draft.includes(keyExtractor(item))
                    const onPress = () => select(item)
                    return renderItem ? (
                        <>{renderItem({ item, selected, disabled: saving, onPress })}</>
                    ) : (
                        <ListButton
                            active={selected}
                            disabled={saving}
                            onPress={onPress}
                            accessibilityState={{ selected }}
                            style={{ paddingHorizontal: 16, paddingVertical: 14, minHeight: 48 }}>
                            <TText>{labelExtractor!(item)}</TText>
                        </ListButton>
                    )
                }}
            />
            {error ? (
                <TText
                    style={{ color: color.error._400, paddingHorizontal: 16, paddingVertical: 8 }}>
                    {error}
                </TText>
            ) : null}
            {commitMode === 'confirm' && (
                <View
                    style={{
                        paddingHorizontal: 16,
                        paddingVertical: 16,
                    }}>
                    <ThemedButton
                        variant={saving || !canConfirm ? 'disabled' : 'secondary'}
                        disabled={saving || !canConfirm}
                        label={confirmLabel ?? t('common.actions.select')}
                        onPress={() => {
                            void commit(draft)
                        }}
                    />
                </View>
            )}
        </BottomSheet>
    )
}
export default SelectionSheet
