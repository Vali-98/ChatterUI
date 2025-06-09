import { AntDesign } from '@expo/vector-icons'
import { CharacterSorter, SearchType } from '@lib/state/CharacterSorter'
import { CharInfo } from '@lib/state/Characters'
import { Theme } from '@lib/theme/ThemeManager'
import React from 'react'
import { Text, StyleSheet, TouchableOpacity } from 'react-native'

type SortButtonProps = {
    type: SearchType
    label: string
}

const SortButton: React.FC<SortButtonProps> = ({ type, label }) => {
    const styles = useStyles()
    const { color } = Theme.useTheme()
    const { searchType, setSearchType, searchOrder, setSearchOrder } = CharacterSorter.useSorter()

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
                    name={searchOrder === 'asc' ? 'caretup' : 'caretdown'}
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
    const { color, spacing, borderWidth, borderRadius } = Theme.useTheme()

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
