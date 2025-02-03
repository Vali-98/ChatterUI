import { Entypo } from '@expo/vector-icons'
import { Theme } from '@lib/theme/ThemeManager'
import { useState } from 'react'
import { FlatList, Modal, Pressable, StyleSheet, Text, View, ViewStyle } from 'react-native'
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
    const styles = useStyles()
    const [showList, setShowList] = useState(false)
    const [searchFilter, setSearchFilter] = useState('')
    const theme = Theme.useTheme()

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
                            placeholderTextColor={theme.color.text._700}
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
                <Entypo name="chevron-down" color={theme.color.primary._300} size={18} />
            </Pressable>
        </View>
    )
}

export default DropdownSheet

const useStyles = () => {
    const { color, spacing, borderRadius } = Theme.useTheme()
    return StyleSheet.create({
        button: {
            paddingHorizontal: spacing.xl,
            paddingVertical: spacing.m,
            alignItems: 'center',
            flexDirection: 'row',
            justifyContent: 'space-between',
            borderRadius: borderRadius.m,
            backgroundColor: color.neutral._200,
        },
        buttonText: {
            color: color.text._300,
            fontSize: 16,
        },
        placeholderText: {
            color: color.text._800,
        },

        modalTitle: {
            color: color.text._300,
            fontSize: 20,
            fontWeight: '500',
            paddingBottom: spacing.xl2,
        },

        listContainer: {
            marginVertical: spacing.xl,
            paddingVertical: spacing.xl2,
            paddingHorizontal: spacing.xl3,
            flexShrink: 1,
            maxHeight: '70%',
            borderTopLeftRadius: spacing.xl2,
            borderTopRightRadius: spacing.xl2,
            backgroundColor: color.neutral._200,
        },

        listItem: {
            paddingVertical: spacing.xl,
            paddingHorizontal: spacing.xl2,
        },

        listItemSelected: {
            paddingVertical: spacing.xl,
            paddingHorizontal: spacing.xl2,
            backgroundColor: color.neutral._300,
            borderRadius: borderRadius.xl,
            borderWidth: 2,
            borderColor: color.primary._300,
        },

        listItemText: {
            color: color.text._400,
            fontSize: 16,
        },

        searchBar: {
            marginTop: spacing.l,
            borderRadius: borderRadius.m,
            padding: spacing.l,
            borderColor: color.primary._100,
            borderWidth: 1,
            backgroundColor: color.neutral._300,
        },
    })
}
