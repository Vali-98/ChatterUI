import ThemedButton from '@components/buttons/ThemedButton'
import ThemedTextInput from '@components/input/ThemedTextInput'
import { AppSettings } from '@lib/constants/GlobalValues'
import { Theme } from '@lib/theme/ThemeManager'
import React, { useEffect, useState } from 'react'
import { BackHandler, Text, View } from 'react-native'
import { useMMKVBoolean } from 'react-native-mmkv'
import Animated, { FadeInUp, FadeOutUp } from 'react-native-reanimated'

import SortButton, { SortType } from './SortButton'

type CharacterListHeaderProps = {
    sortType: SortType
    setSortType: (type: SortType) => void
    textFilter: string
    setTextFilter: (value: string) => void
    resultLength: number
}

const CharacterListHeader: React.FC<CharacterListHeaderProps> = ({
    sortType,
    setSortType,
    textFilter,
    setTextFilter,
    resultLength,
}) => {
    const { color } = Theme.useTheme()
    const [showTags, setShowTags] = useMMKVBoolean(AppSettings.ShowTags)
    const [showSearch, setShowSearch] = useState(false)

    useEffect(() => {
        if (!showSearch) return
        const handler = BackHandler.addEventListener('hardwareBackPress', () => {
            setTextFilter('')
            setShowSearch(false)
            return true
        })
        return () => handler.remove()
    }, [showSearch])

    return (
        <View>
            <View
                style={{
                    flexDirection: 'row',
                    justifyContent: 'space-between',
                    paddingLeft: 16,
                    paddingRight: 8,
                    paddingBottom: 12,
                }}>
                <View
                    style={{
                        columnGap: 12,
                        flexDirection: 'row',
                        alignItems: 'center',
                    }}>
                    <Text
                        style={{
                            color: color.text._400,
                            fontSize: 16,
                        }}>
                        Sort By
                    </Text>
                    <SortButton
                        type="recent"
                        currentSortType={sortType}
                        label="Recent"
                        onPress={(type) => {
                            setSortType(type)
                        }}
                    />
                    <SortButton
                        type="alphabetical"
                        currentSortType={sortType}
                        label="Name"
                        onPress={(type) => {
                            setSortType(type)
                        }}
                    />
                </View>
                <View
                    style={{
                        flexDirection: 'row',
                        columnGap: 12,
                    }}>
                    <ThemedButton
                        iconName="tag"
                        variant="tertiary"
                        onPress={() => {
                            setShowTags(!showTags)
                        }}
                        iconStyle={{
                            color: showTags ? color.text._100 : color.text._700,
                        }}
                    />
                    <ThemedButton
                        variant="tertiary"
                        iconName={showSearch ? 'close' : 'search1'}
                        onPress={() => {
                            if (showSearch) setTextFilter('')
                            setShowSearch(!showSearch)
                        }}
                        iconSize={24}
                    />
                </View>
            </View>
            {showSearch && (
                <Animated.View
                    style={{ paddingHorizontal: 12, paddingVertical: 8 }}
                    entering={FadeInUp.duration(150).withInitialValues({
                        transform: [{ translateY: -20 }],
                    })}
                    exiting={FadeOutUp.duration(100)}>
                    <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                        <ThemedTextInput
                            value={textFilter}
                            onChangeText={setTextFilter}
                            style={{
                                color: resultLength === 0 ? color.text._700 : color.text._100,
                            }}
                            placeholder="Search Name..."
                        />
                    </View>
                    {textFilter && (
                        <Text
                            style={{
                                marginTop: 8,
                                color: color.text._400,
                            }}>
                            Results: {resultLength}
                        </Text>
                    )}
                </Animated.View>
            )}
        </View>
    )
}

export default CharacterListHeader
