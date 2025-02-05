import { Entypo } from '@expo/vector-icons'
import { Theme } from '@lib/theme/ThemeManager'
import { useState } from 'react'
import { FlatList, Modal, Pressable, Text, View, ViewStyle, TextInput } from 'react-native'

import { useDropdownStyles } from './MultiDropdownSheet'
import FadeBackrop from '../views/FadeBackdrop'

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
}

const DropdownSheet = <T,>({
    containerStyle = undefined,
    onChangeValue,
    style,
    selected = undefined,
    data = [],
    placeholder = 'Select Item...',
    modalTitle = 'Select Item',
    labelExtractor = (data) => {
        return data as string
    },
    search = false,
    closeOnSelect = true,
}: DropdownSheetProps<T>) => {
    const styles = useDropdownStyles()
    const [showList, setShowList] = useState(false)
    const [searchFilter, setSearchFilter] = useState('')
    const theme = Theme.useTheme()
    const items = data.filter((item) =>
        labelExtractor(item).toLowerCase().includes(searchFilter.toLowerCase())
    )
    return (
        <View style={containerStyle}>
            <Modal
                transparent
                onRequestClose={() => setShowList(false)}
                statusBarTranslucent
                visible={showList}
                animationType="fade">
                <FadeBackrop
                    handleOverlayClick={() => {
                        setSearchFilter('')
                        setShowList(false)
                    }}
                />
                <View style={{ flex: 1 }} />
                <View style={styles.listContainer}>
                    <Text style={styles.modalTitle}>{modalTitle}</Text>
                    {items.length > 0 ? (
                        <FlatList
                            contentContainerStyle={{ rowGap: 2 }}
                            showsVerticalScrollIndicator={false}
                            data={items}
                            keyExtractor={(item, index) => index.toString()}
                            renderItem={({ item, index }) => (
                                <Pressable
                                    style={
                                        selected &&
                                        labelExtractor(item) === labelExtractor(selected)
                                            ? styles.listItemSelected
                                            : styles.listItem
                                    }
                                    onPress={() => {
                                        onChangeValue(item)
                                        setShowList(!closeOnSelect)
                                    }}>
                                    <Text style={styles.listItemText}>{labelExtractor(item)}</Text>
                                </Pressable>
                            )}
                        />
                    ) : (
                        <Text style={styles.emptyText}>No Items</Text>
                    )}
                    {search && (
                        <TextInput
                            placeholder="Filter..."
                            placeholderTextColor={theme.color.text._300}
                            style={styles.searchBar}
                            value={searchFilter}
                            onChangeText={setSearchFilter}
                        />
                    )}
                </View>
            </Modal>
            <Pressable style={[style, styles.button]} onPress={() => setShowList(true)}>
                {selected && <Text style={styles.buttonText}>{labelExtractor(selected)}</Text>}
                {!selected && <Text style={styles.placeholderText}>{placeholder}</Text>}
                <Entypo name="chevron-down" color={theme.color.primary._800} size={18} />
            </Pressable>
        </View>
    )
}

export default DropdownSheet
