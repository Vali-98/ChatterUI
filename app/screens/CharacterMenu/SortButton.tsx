import { AntDesign } from '@expo/vector-icons'
import { CharInfo } from '@lib/state/Characters'
import { Theme } from '@lib/theme/ThemeManager'
import React from 'react'
import { Text, StyleSheet, TouchableOpacity } from 'react-native'

export enum SortType {
    RECENT_ASC,
    RECENT_DESC,
    ALPHABETICAL_ASC,
    ALPHABETICAL_DESC,
}

const sortModifiedDesc = (item1: CharInfo, item2: CharInfo) => {
    return item2.last_modified - item1.last_modified
}

const sortModifiedAsc = (item1: CharInfo, item2: CharInfo) => {
    return -(item2.last_modified - item1.last_modified)
}

const sortAlphabeticalAsc = (item1: CharInfo, item2: CharInfo) => {
    return -item2.name.localeCompare(item1.name)
}

const sortAlphabeticalDesc = (item1: CharInfo, item2: CharInfo) => {
    return item2.name.localeCompare(item1.name)
}

export const sortList = {
    [SortType.RECENT_ASC]: sortModifiedAsc,
    [SortType.RECENT_DESC]: sortModifiedDesc,
    [SortType.ALPHABETICAL_ASC]: sortAlphabeticalAsc,
    [SortType.ALPHABETICAL_DESC]: sortAlphabeticalDesc,
}

const recentStateMap = {
    [SortType.RECENT_ASC]: SortType.RECENT_DESC,
    [SortType.RECENT_DESC]: SortType.RECENT_ASC,
    [SortType.ALPHABETICAL_ASC]: SortType.RECENT_DESC,
    [SortType.ALPHABETICAL_DESC]: SortType.RECENT_DESC,
}

const alphabeticalStateMap = {
    [SortType.RECENT_ASC]: SortType.ALPHABETICAL_ASC,
    [SortType.RECENT_DESC]: SortType.ALPHABETICAL_ASC,
    [SortType.ALPHABETICAL_ASC]: SortType.ALPHABETICAL_DESC,
    [SortType.ALPHABETICAL_DESC]: SortType.ALPHABETICAL_ASC,
}

const buttonType = {
    recent: [SortType.RECENT_ASC, SortType.RECENT_DESC],
    alphabetical: [SortType.ALPHABETICAL_ASC, SortType.ALPHABETICAL_DESC],
}

type SortButtonProps = {
    type: keyof typeof buttonType
    currentSortType: SortType
    label: string
    onPress: (type: SortType) => void | Promise<void>
}

const SortButton: React.FC<SortButtonProps> = ({ type, currentSortType, label, onPress }) => {
    const styles = useStyles()
    const { color } = Theme.useTheme()
    const isCurrent = buttonType[type].includes(currentSortType)
    const isAsc = buttonType[type][0] === currentSortType
    return (
        <TouchableOpacity
            onPress={() => {
                if (type === 'recent') {
                    onPress(recentStateMap[currentSortType])
                }
                if (type === 'alphabetical') {
                    onPress(alphabeticalStateMap[currentSortType])
                }
            }}
            style={isCurrent ? styles.sortButtonActive : styles.sortButton}>
            {isCurrent && (
                <AntDesign
                    size={14}
                    name={isAsc ? 'caretup' : 'caretdown'}
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
