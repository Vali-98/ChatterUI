import { View, type StyleProp, type ViewStyle } from 'react-native'
import { useTranslation } from 'react-i18next'

import { useBottomSheetRef } from '@components/views/BottomSheet'
import DropdownTrigger from './DropdownTrigger'
import SelectionSheet, { type SelectionKey, type SelectionRow } from './SelectionSheet'

export type MultiDropdownSheetProps<T> = {
    containerStyle?: StyleProp<ViewStyle>
    contentContainerStyle?: StyleProp<ViewStyle>
    style?: StyleProp<ViewStyle>
    data: T[]
    selected: T[]
    onChangeValue: (items: T[]) => void | Promise<void>
    keyExtractor: (item: T) => SelectionKey
    labelExtractor: (item: T) => string
    renderItem?: (row: SelectionRow<T>) => React.ReactNode
    search?: boolean
    placeholder?: string
    modalTitle?: string
    closeOnSelect?: boolean
    commitMode?: 'immediate' | 'confirm'
    confirmLabel?: string
    allowEmpty?: boolean
    disabled?: boolean
}
const MultiDropdownSheet = <T,>({
    containerStyle,
    contentContainerStyle,
    style,
    data,
    selected,
    onChangeValue,
    keyExtractor,
    labelExtractor,
    renderItem,
    search,
    placeholder,
    modalTitle,
    closeOnSelect,
    commitMode = 'confirm',
    confirmLabel,
    allowEmpty,
    disabled,
}: MultiDropdownSheetProps<T>) => {
    const { t } = useTranslation()
    const ref = useBottomSheetRef()
    return (
        <View style={containerStyle}>
            <SelectionSheet
                multiple
                ref={ref}
                contentContainerStyle={contentContainerStyle}
                items={data}
                keyExtractor={keyExtractor}
                labelExtractor={labelExtractor}
                renderItem={renderItem}
                selectedKeys={selected.map(keyExtractor)}
                onSelect={onChangeValue}
                allowEmpty={allowEmpty}
                search={search}
                title={modalTitle}
                closeOnSelect={closeOnSelect}
                commitMode={commitMode}
                confirmLabel={confirmLabel}
                buttonLevel="primary"
            />
            <DropdownTrigger
                label={
                    selected.length
                        ? `${selected.length} ${t('common.labels.selected')}`
                        : undefined
                }
                placeholder={placeholder ?? t('dropdown.selectItem')}
                onPress={() => ref.current?.open()}
                disabled={disabled}
                style={style}
            />
        </View>
    )
}
export default MultiDropdownSheet
