import { Entypo } from '@expo/vector-icons'
import { Style } from '@globals'
import { useState } from 'react'
import { Modal, Pressable, StyleSheet, Text, View, FlatList, ViewStyle } from 'react-native'
import { TextInput } from 'react-native-gesture-handler'

import FadeBackrop from './FadeBackdrop'

type DropdownItemProps = {
    label: string
    active: boolean
    onValueChange: (b: boolean) => void
}

const DropdownItem: React.FC<DropdownItemProps> = ({ label, active, onValueChange }) => {
    return (
        <Pressable
            style={active ? styles.listItemSelected : styles.listItem}
            onPress={() => {
                onValueChange(!active)
            }}>
            <Text style={styles.listItemText}>{label}</Text>
        </Pressable>
    )
}

type DropdownSheetProps<T> = {
    style?: ViewStyle
    data: T[]
    selected: T[]
    onChangeValue: (data: T[]) => void
    labelExtractor: (data: T) => string
    search?: boolean
    placeholder?: string
    modalTitle?: string
    closeOnSelect?: boolean
}

const MultiDropdownSheet = <T,>({
    onChangeValue,
    style,
    selected,
    data = [],
    placeholder = 'Select Item...',
    modalTitle = 'Select Item',
    labelExtractor = (data) => {
        return data as string
    },
    search = false,
    closeOnSelect = true,
}: DropdownSheetProps<T>) => {
    const [showList, setShowList] = useState(false)
    const [searchFilter, setSearchFilter] = useState('')
    return (
        <View style={{ flex: 1 }}>
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
                    <FlatList
                        showsVerticalScrollIndicator={false}
                        data={data.filter((item) =>
                            labelExtractor(item).toLowerCase().includes(searchFilter.toLowerCase())
                        )}
                        keyExtractor={(item, index) => index.toString()}
                        renderItem={({ item, index }) => (
                            <DropdownItem
                                label={labelExtractor(item)}
                                active={selected?.some(
                                    (e) => labelExtractor(e) === labelExtractor(item)
                                )}
                                onValueChange={(active) => {
                                    if (!active && selected.length > 0) {
                                        const data = selected.filter(
                                            (e) => labelExtractor(e) !== labelExtractor(item)
                                        )
                                        onChangeValue(data)
                                    } else {
                                        // we duplicate for a fresh reference
                                        const data = [...selected]
                                        if (
                                            selected.some(
                                                (e) => labelExtractor(e) === labelExtractor(item)
                                            )
                                        )
                                            return
                                        data.push(item)
                                        onChangeValue(data)
                                    }
                                }}
                            />
                        )}
                    />
                    {search && (
                        <TextInput
                            placeholder="Filter..."
                            placeholderTextColor={Style.getColor('primary-text3')}
                            style={styles.searchBar}
                            value={searchFilter}
                            onChangeText={setSearchFilter}
                        />
                    )}
                </View>
            </Modal>
            <Pressable style={[style, styles.button]} onPress={() => setShowList(true)}>
                {selected && selected.length > 0 && (
                    <Text style={styles.buttonText}>{selected.length} Items Selected</Text>
                )}
                {(!selected || selected.length === 0) && (
                    <Text style={styles.placeholderText}>{placeholder}</Text>
                )}
                <Entypo name="chevron-down" color={Style.getColor('primary-text2')} size={18} />
            </Pressable>
        </View>
    )
}

export default MultiDropdownSheet

const styles = StyleSheet.create({
    button: {
        paddingHorizontal: 16,
        paddingVertical: 8,
        alignItems: 'center',
        flexDirection: 'row',
        justifyContent: 'space-between',
        borderRadius: 8,
        backgroundColor: Style.getColor('primary-surface2'),
    },
    buttonText: {
        color: Style.getColor('primary-text1'),
        fontSize: 16,
    },
    placeholderText: {
        color: Style.getColor('primary-text3'),
    },

    modalTitle: {
        color: Style.getColor('primary-text1'),
        fontSize: 20,
        fontWeight: '500',
        paddingBottom: 24,
    },

    listContainer: {
        marginVertical: 16,
        paddingVertical: 24,
        paddingHorizontal: 32,
        flexShrink: 1,
        maxHeight: '70%',
        borderTopLeftRadius: 24,
        borderTopRightRadius: 24,
        backgroundColor: Style.getColor('primary-surface1'),
    },

    listItem: {
        marginBottom: 8,
        paddingVertical: 9,
        paddingHorizontal: 12,
        borderWidth: 1,
        borderColor: Style.getColor('primary-surface1'),
    },

    listItemSelected: {
        marginBottom: 8,
        paddingVertical: 9,
        paddingHorizontal: 12,
        borderWidth: 1,
        borderRadius: 16,
        borderColor: Style.getColor('primary-brand'),
    },

    listItemText: {
        color: Style.getColor('primary-text2'),
        fontSize: 16,
    },

    searchBar: {
        marginTop: 12,
        borderRadius: 8,
        padding: 12,
        borderColor: Style.getColor('primary-surface4'),
        borderWidth: 1,
        color: Style.getColor('primary-text1'),
        backgroundColor: Style.getColor('primary-surface2'),
    },
})
