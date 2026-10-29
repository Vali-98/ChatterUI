import type { OcticonsIconName } from '@react-native-vector-icons/octicons/static'
import { View, type StyleProp, type ViewStyle } from 'react-native'
import { useTranslation } from 'react-i18next'

import { useBottomSheetRef } from '@components/views/BottomSheet'
import DropdownTrigger from './DropdownTrigger'
import SelectionSheet, { type SelectionKey, type SelectionRow } from './SelectionSheet'

export type DropdownSheetProps<T> = {
    containerStyle?: StyleProp<ViewStyle>
    contentContainerStyle?: StyleProp<ViewStyle>
    style?: StyleProp<ViewStyle>
    data: T[]
    selected?: T | null
    onChangeValue: (item: T) => void | Promise<void>
    keyExtractor: (item: T) => SelectionKey
    labelExtractor: (item: T) => string
    renderItem?: (row: SelectionRow<T>) => React.ReactNode
    search?: boolean
    placeholder?: string
    modalTitle?: string
    closeOnSelect?: boolean
    commitMode?: 'immediate' | 'confirm'
    confirmLabel?: string
    disabled?: boolean
    icon?: OcticonsIconName | null
    iconPosition?: 'right' | 'left'
    iconSize?: number
}
const DropdownSheet = <T,>({
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
    commitMode,
    confirmLabel,
    disabled,
    icon,
    iconPosition,
    iconSize,
}: DropdownSheetProps<T>) => {
    const { t } = useTranslation()
    const ref = useBottomSheetRef()
    return (
        <View style={containerStyle}>
            <SelectionSheet
                ref={ref}
                contentContainerStyle={contentContainerStyle}
                items={data}
                keyExtractor={keyExtractor}
                labelExtractor={labelExtractor}
                renderItem={renderItem}
                selectedKey={selected == null ? null : keyExtractor(selected)}
                onSelect={onChangeValue}
                search={search}
                title={modalTitle}
                closeOnSelect={closeOnSelect}
                commitMode={commitMode}
                confirmLabel={confirmLabel}
            />
            <DropdownTrigger
                label={selected == null ? undefined : labelExtractor(selected)}
                placeholder={placeholder ?? t('dropdown.selectItem')}
                onPress={() => ref.current?.open()}
                disabled={disabled}
                style={style}
                icon={icon}
                iconPosition={iconPosition}
                iconSize={iconSize}
            />
        </View>
    )
}
export default DropdownSheet
