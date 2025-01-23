import { Entypo } from '@expo/vector-icons'
import { Style } from '@lib/utils/Global'
import { useState } from 'react'
import { Modal, Pressable, StyleSheet, Text, View, FlatList, ViewStyle } from 'react-native'
import { TextInput } from 'react-native-gesture-handler'

import FadeBackrop from '../views/FadeBackdrop'
type DropdownSheetProps<T> = {
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
                            <Pressable
                                style={
                                    selected && labelExtractor(item) === labelExtractor(selected)
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
                {selected && <Text style={styles.buttonText}>{labelExtractor(selected)}</Text>}
                {!selected && <Text style={styles.placeholderText}>{placeholder}</Text>}
                <Entypo name="chevron-down" color={Style.getColor('primary-text2')} size={18} />
            </Pressable>
        </View>
    )
}

export default DropdownSheet

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
        paddingVertical: 17,
        paddingHorizontal: 12,
        borderWidth: 1,
        borderColor: Style.getColor('primary-surface1'),
    },

    listItemSelected: {
        paddingVertical: 17,
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
