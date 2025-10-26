import { AntDesign } from '@expo/vector-icons'
import React from 'react'
import { StyleSheet, Text, TouchableOpacity } from 'react-native'
import { useShallow } from 'zustand/react/shallow'

import { CharacterSorter, SearchType } from '@lib/state/CharacterSorter'
import { Theme } from '@lib/theme/ThemeManager'

type SortButtonProps = {
    type: SearchType
    label: string
}

const SortButton: React.FC<SortButtonProps> = ({ type, label }) => {
    const styles = useStyles()
    const { color } = Theme.useTheme()
    const { searchType, setSearchType, searchOrder, setSearchOrder } =
        CharacterSorter.useSorterStore(
            useShallow((state) => ({
                searchType: state.searchType,
                setSearchType: state.setType,
                searchOrder: state.searchOrder,
                setSearchOrder: state.setOrder,
            }))
        )

    const isCurrent = type === searchType

    return (
        <TouchableOpacity
            onPress={() => {
                setSearchOrder(searchType !== type || searchOrder === 'asc' ? 'desc' : 'asc')
                setSearchType(type)
            }}
            style={isCurrent ? styles.sortButtonActive : styles.sortButton}>
            {isCurrent && (
                <AntDesign
                    size={14}
                    name={
                        (searchOrder === 'asc' && type === 'modified') ||
                        (searchOrder === 'desc' && type === 'name')
                            ? 'caretup'
                            : 'caretdown'
                    }
                    color={color.text._100}
                />
            )}
            <Text style={isCurrent ? styles.sortButtonTextActive : styles.sortButtonText}>
                {label}
            </Text>
        </TouchableOpacity>
    )
}

export default SortButton

const useStyles = () => {
    const { color, spacing, borderRadius } = Theme.useTheme()

    return StyleSheet.create({
        sortButton: {
            alignItems: 'center',
            flexDirection: 'row',
            paddingHorizontal: spacing.xl,
            paddingVertical: spacing.m,
            backgroundColor: color.neutral._200,
            borderRadius: borderRadius.xl,
        },

        sortButtonActive: {
            alignItems: 'center',
            flexDirection: 'row',
            paddingHorizontal: spacing.xl,
            paddingVertical: spacing.m,
            backgroundColor: color.primary._300,
            borderRadius: borderRadius.xl,
        },

        sortButtonText: {
            color: color.text._400,
        },

        sortButtonTextActive: {
            marginLeft: 4,
            color: color.text._100,
        },
    })
}
