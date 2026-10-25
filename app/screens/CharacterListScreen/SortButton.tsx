import AntDesign from '@react-native-vector-icons/ant-design/static'
import React from 'react'
import { Pressable, StyleSheet, Text } from 'react-native'
import Animated from 'react-native-reanimated'
import { useShallow } from 'zustand/react/shallow'

import useAnimatedActiveColorStyle from '@lib/hooks/AnimatedActiveColorStyle'
import { useCharacterSortStore } from '@lib/state/characters/sortStore'
import type { CharacterSortBy } from '@lib/state/characters/types'
import { Theme } from '@lib/theme/ThemeManager'

type SortButtonProps = {
    sortBy: CharacterSortBy
    label: string
}

const SortButton: React.FC<SortButtonProps> = ({ sortBy, label }) => {
    const styles = useStyles()
    const { color } = Theme.useTheme()
    const { selectedSortBy, setSortBy, sortDirection, setSortDirection } = useCharacterSortStore(
        useShallow((state) => ({
            selectedSortBy: state.searchType,
            setSortBy: state.setSortBy,
            sortDirection: state.searchOrder,
            setSortDirection: state.setSortDirection,
        }))
    )

    const isCurrent = sortBy === selectedSortBy
    const animatedStyle = useAnimatedActiveColorStyle({
        active: isCurrent,
        activeColor: color.primary._300,
        deactiveColor: color.neutral._200,
        colorProp: 'backgroundColor',
    })
    return (
        <Animated.View style={[styles.buttonContainer, animatedStyle]}>
            <Pressable
                onPress={() => {
                    setSortDirection(
                        selectedSortBy !== sortBy || sortDirection === 'asc' ? 'desc' : 'asc'
                    )
                    setSortBy(sortBy)
                }}
                style={styles.sortButton}>
                {isCurrent && (
                    <AntDesign
                        size={14}
                        name={
                            (sortDirection === 'asc' && sortBy === 'modified') ||
                            (sortDirection === 'desc' && sortBy === 'name')
                                ? 'caret-up'
                                : 'caret-down'
                        }
                        color={color.text._100}
                    />
                )}
                <Text style={isCurrent ? styles.sortButtonTextActive : styles.sortButtonText}>
                    {label}
                </Text>
            </Pressable>
        </Animated.View>
    )
}

export default SortButton

const useStyles = () => {
    const { color, spacing, borderRadius } = Theme.useTheme()

    return StyleSheet.create({
        buttonContainer: {
            borderRadius: borderRadius.xl,
        },

        sortButton: {
            paddingHorizontal: spacing.xl,
            paddingVertical: spacing.m,
            alignItems: 'center',
            flexDirection: 'row',
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
