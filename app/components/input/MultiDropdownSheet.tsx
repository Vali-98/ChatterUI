import FadeBackrop from '@components/views/FadeBackdrop'
import { Entypo } from '@expo/vector-icons'
import { Theme } from '@lib/theme/ThemeManager'
import { useState } from 'react'
import {
    Modal,
    Pressable,
    StyleSheet,
    Text,
    View,
    FlatList,
    ViewStyle,
    TextInput,
} from 'react-native'

type DropdownItemProps = {
    label: string
    active: boolean
    onValueChange: (b: boolean) => void
}

const DropdownItem: React.FC<DropdownItemProps> = ({ label, active, onValueChange }) => {
    const styles = useDropdownStyles()
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
    containerStyle?: ViewStyle
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
    containerStyle = undefined,
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
    const styles = useDropdownStyles()
    const { color, spacing } = Theme.useTheme()
    const [showList, setShowList] = useState(false)
    const [searchFilter, setSearchFilter] = useState('')

    const items = data.filter((item) =>
        labelExtractor(item)
            ?.toLowerCase()
            .includes(searchFilter.toLowerCase() ?? true)
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
                    <View
                        style={{
                            marginBottom: spacing.xl2,
                            flexDirection: 'row',
                            justifyContent: 'space-between',
                        }}>
                        <Text style={styles.modalTitle}>{modalTitle}</Text>
                        <Text style={styles.counterText}>
                            {selected.length > 0
                                ? `Selected ${selected.length} item${selected.length > 1 ? 's' : ''}`
                                : 'No items selected'}
                        </Text>
                    </View>
                    {items.length > 0 ? (
                        <FlatList
                            contentContainerStyle={{ rowGap: 2 }}
                            showsVerticalScrollIndicator={false}
                            data={items}
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
                                                    (e) =>
                                                        labelExtractor(e) === labelExtractor(item)
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
                    ) : (
                        <Text style={styles.emptyText}>No Items</Text>
                    )}
                    {search && (
                        <TextInput
                            placeholder="Filter..."
                            placeholderTextColor={color.text._300}
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
                <Entypo name="chevron-down" color={color.primary._800} size={18} />
            </Pressable>
        </View>
    )
}

export default MultiDropdownSheet

export const useDropdownStyles = () => {
    const { color, spacing, borderRadius } = Theme.useTheme()
    return StyleSheet.create({
        button: {
            paddingHorizontal: spacing.xl,
            paddingVertical: spacing.m,
            alignItems: 'center',
            flexDirection: 'row',
            justifyContent: 'space-between',
            borderRadius: borderRadius.m,
            backgroundColor: color.primary._300,
        },
        buttonText: {
            color: color.text._100,
        },
        placeholderText: {
            color: color.text._300,
        },

        modalTitle: {
            color: color.text._300,
            fontSize: 20,
            fontWeight: '500',
            paddingBottom: spacing.xl2,
        },

        listContainer: {
            paddingVertical: spacing.xl2,
            paddingHorizontal: spacing.xl3,
            flexShrink: 1,
            maxHeight: '70%',
            borderTopLeftRadius: spacing.xl2,
            borderTopRightRadius: spacing.xl2,
            backgroundColor: color.neutral._100,
        },

        listItem: {
            paddingVertical: spacing.xl,
            paddingHorizontal: spacing.xl2,
        },

        listItemSelected: {
            paddingVertical: spacing.xl,
            paddingHorizontal: spacing.xl2,
            backgroundColor: color.primary._200,
            borderRadius: borderRadius.xl,
        },

        emptyText: {
            color: color.text._400,
            padding: spacing.xl,
        },

        listItemText: {
            color: color.text._200,
            fontSize: 16,
        },

        searchBar: {
            marginTop: spacing.l,
            borderRadius: borderRadius.m,
            padding: spacing.l,
            backgroundColor: color.neutral._200,
            color: color.text._100,
            textAlignVertical: 'center',
        },

        counterText: {
            color: color.text._800,
            fontSize: 14,
            paddingBottom: spacing.xl2,
        },
    })
}
