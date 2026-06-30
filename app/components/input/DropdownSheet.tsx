import Octicons, { OcticonsIconName } from '@react-native-vector-icons/octicons/static'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { FlatList, Pressable, Text, TextInput, View, ViewStyle } from 'react-native'

import BottomSheet, { useBottomSheetRef } from '@components/views/BottomSheet'
import { Theme } from '@lib/theme/ThemeManager'

import { useDropdownStyles } from './MultiDropdownSheet'

type DropdownSheetProps<T> = {
    containerStyle?: ViewStyle
    style?: ViewStyle
    data: T[]
    selected?: T | undefined
    onChangeValue: (data: T) => void
    labelExtractor: (data: T) => string
    search?: boolean
    placeholder?: string
    modalTitle?: string
    closeOnSelect?: boolean
    icon?: OcticonsIconName | null
    iconPosition?: 'right' | 'left'
    iconSize?: number
}

const DropdownSheet = <T,>({
    containerStyle = undefined,
    onChangeValue,
    style,
    selected = undefined,
    data = [],
    placeholder: propPlaceholder, // Renamed to avoid conflict
    modalTitle: propModalTitle, // Renamed to avoid conflict
    labelExtractor = (data) => {
        return data as string
    },
    search = false,
    closeOnSelect = true,
    icon = 'chevron-down',
    iconPosition = 'right',
    iconSize = 18,
}: DropdownSheetProps<T>) => {
    const styles = useDropdownStyles()
    const sheetRef = useBottomSheetRef()
    const [searchFilter, setSearchFilter] = useState('')
    const theme = Theme.useTheme()
    const { t } = useTranslation()

    // Translate default placeholder and modal title if not provided
    const placeholder = propPlaceholder ?? t('dropdown.selectItem')
    const modalTitle = propModalTitle ?? t('dropdown.selectItem')

    const items = data.filter((item) =>
        labelExtractor(item).toLowerCase().includes(searchFilter.toLowerCase())
    )

    return (
        <View style={containerStyle}>
            <BottomSheet
                ref={sheetRef}
                onClose={() => {
                    setSearchFilter('')
                }}>
                <Text style={styles.modalTitle}>{modalTitle}</Text>
                {items.length > 0 ? (
                    <FlatList
                        contentContainerStyle={{ rowGap: 2 }}
                        showsVerticalScrollIndicator={false}
                        data={items}
                        keyExtractor={(item, index) => index.toString()}
                        renderItem={({ item }) => (
                            <Pressable
                                style={
                                    selected && labelExtractor(item) === labelExtractor(selected)
                                        ? styles.listItemSelected
                                        : styles.listItem
                                }
                                onPress={() => {
                                    onChangeValue(item)
                                    if (closeOnSelect) sheetRef.current?.close()
                                }}>
                                <Text style={styles.listItemText}>{labelExtractor(item)}</Text>
                            </Pressable>
                        )}
                    />
                ) : (
                    <Text style={styles.emptyText}>{t('common.emptyStates.noItems')}</Text>
                )}
                {search && (
                    <TextInput
                        placeholder={t('dropdown.filter')}
                        placeholderTextColor={theme.color.text._300}
                        style={styles.searchBar}
                        value={searchFilter}
                        onChangeText={setSearchFilter}
                    />
                )}
            </BottomSheet>
            <Pressable
                style={[
                    styles.button,
                    style,
                    {
                        flexDirection: iconPosition === 'right' ? 'row' : 'row-reverse',
                        columnGap: 8,
                    },
                ]}
                onPress={() => sheetRef.current?.open()}>
                {selected && <Text style={styles.buttonText}>{labelExtractor(selected)}</Text>}
                {!selected && <Text style={styles.placeholderText}>{placeholder}</Text>}
                {icon && <Octicons name={icon} color={theme.color.primary._800} size={iconSize} />}
            </Pressable>
        </View>
    )
}

export default DropdownSheet
