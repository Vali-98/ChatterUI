import AntDesign from '@react-native-vector-icons/ant-design/static'
import React from 'react'
import { Pressable, StyleSheet, Text } from 'react-native'
import Animated from 'react-native-reanimated'
import { useShallow } from 'zustand/react/shallow'

import useAnimatedActiveColorStyle from '@lib/hooks/AnimatedActiveColorStyle'
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
                    setSearchOrder(searchType !== type || searchOrder === 'asc' ? 'desc' : 'asc')
                    setSearchType(type)
                }}
                style={styles.sortButton}>
                {isCurrent && (
                    <AntDesign
                        size={14}
                        name={
                            (searchOrder === 'asc' && type === 'modified') ||
                            (searchOrder === 'desc' && type === 'name')
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
