import ThemedButton from '@components/buttons/ThemedButton'
import StringArrayEditor from '@components/input/StringArrayEditor'
import ThemedTextInput from '@components/input/ThemedTextInput'
import { db } from '@db'
import { AppSettings } from '@lib/constants/GlobalValues'
import { CharInfo } from '@lib/state/Characters'
import { Theme } from '@lib/theme/ThemeManager'
import { characterTags, tags } from 'db/schema'
import { count, eq } from 'drizzle-orm'
import { useLiveQuery } from 'drizzle-orm/expo-sqlite'
import { useFocusEffect } from 'expo-router'
import { useCallback } from 'react'
import { BackHandler, Text, View } from 'react-native'
import { useMMKVBoolean } from 'react-native-mmkv'
import Animated, { FadeInUp, FadeOutUp } from 'react-native-reanimated'
import { create } from 'zustand'

import SortButton, { sortList, SortType } from './SortButton'

type CharacterListSorterProps = {
    showSearch: boolean
    setShowSearch: (b: boolean) => void
    sortType: SortType
    tagFilter: string[]
    textFilter: string
    setSortType: (type: SortType) => void
    setTextFilter: (value: string) => void
    setTagFilter: (filter: string[]) => void
    sortAndFilterCharInfo: (infoList: CharInfo[]) => CharInfo[]
}

const getFilter = (textFilter: string, tagFilter: string[], sortType: SortType) => {
    return (infoList: CharInfo[]) => {
        return infoList
            .filter(
                (item) =>
                    item.name.toLowerCase().includes(textFilter.toLowerCase()) &&
                    (tagFilter.length === 0 || tagFilter.every((tag) => item.tags.includes(tag)))
            )
            .sort(sortList[sortType])
    }
}

export const useCharacterListSorter = create<CharacterListSorterProps>()((set, get) => ({
    sortType: SortType.RECENT_DESC,
    showSearch: false,
    textFilter: '',
    tagFilter: [],
    setShowSearch: (b) => {
        if (b) set((state) => ({ ...state, showSearch: b }))
        else
            set((state) => ({
                ...state,
                showSearch: b,
                textFilter: '',
                tagFilter: [],
                sortAndFilterCharInfo: getFilter('', [], get().sortType),
            }))
    },
    setSortType: (sortType: SortType) => {
        set((stete) => ({
            ...stete,
            sortType: sortType,
            sortAndFilterCharInfo: getFilter(get().textFilter, get().tagFilter, sortType),
        }))
    },
    setTextFilter: (textFilter: string) => {
        set((stete) => ({
            ...stete,
            textFilter: textFilter,
            sortAndFilterCharInfo: getFilter(textFilter, get().tagFilter, get().sortType),
        }))
    },
    setTagFilter: (tagFilter: string[]) => {
        set((stete) => ({
            ...stete,
            tagFilter: tagFilter,
            sortAndFilterCharInfo: getFilter(get().textFilter, tagFilter, get().sortType),
        }))
    },
    sortAndFilterCharInfo: getFilter('', [], SortType.RECENT_DESC),
}))

type CharacterListHeaderProps = {
    resultLength: number
}

const CharacterListHeader: React.FC<CharacterListHeaderProps> = ({ resultLength }) => {
    const {
        showSearch,
        setShowSearch,
        sortType,
        setSortType,
        textFilter,
        setTextFilter,
        tagFilter,
        setTagFilter,
    } = useCharacterListSorter((state) => ({
        showSearch: state.showSearch,
        setShowSearch: state.setShowSearch,
        sortType: state.sortType,
        setSortType: state.setSortType,
        textFilter: state.textFilter,
        setTextFilter: state.setTextFilter,
        tagFilter: state.tagFilter,
        setTagFilter: state.setTagFilter,
    }))

    const { color } = Theme.useTheme()
    const [showTags, setShowTags] = useMMKVBoolean(AppSettings.ShowTags)

    const { data } = useLiveQuery(
        db
            .select({
                tag: tags.tag,
                tagCount: count(characterTags.tag_id),
            })
            .from(tags)
            .leftJoin(characterTags, eq(characterTags.tag_id, tags.id))
            .groupBy(tags.id)
    )

    useFocusEffect(
        useCallback(() => {
            if (!showSearch) return
            const handler = BackHandler.addEventListener('hardwareBackPress', () => {
                setTextFilter('')
                setShowSearch(false)
                return true
            })
            return () => handler.remove()
        }, [showSearch])
    )

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
                            setShowSearch(!showSearch)
                        }}
                        iconSize={24}
                    />
                </View>
            </View>
            {showSearch && (
                <Animated.View
                    style={{ paddingHorizontal: 12, paddingVertical: 8, rowGap: 8 }}
                    entering={FadeInUp.duration(150).withInitialValues({
                        transform: [{ translateY: -20 }],
                    })}
                    exiting={FadeOutUp.duration(100)}>
                    {showTags &&
                        (data.length > 0 ? (
                            <StringArrayEditor
                                containerStyle={{ flex: 0 }}
                                suggestions={data
                                    .sort((a, b) => b.tagCount - a.tagCount)
                                    .map((item) => item.tag)}
                                label="Tags"
                                value={tagFilter}
                                setValue={setTagFilter}
                                placeholder="Filter Tags..."
                                filterOnly
                                showSuggestionsOnEmpty
                            />
                        ) : (
                            <Text
                                style={{
                                    color: color.text._500,
                                    fontStyle: 'italic',
                                    paddingVertical: 8,
                                    paddingHorizontal: 16,
                                    borderRadius: 8,
                                    borderWidth: 1,
                                    borderColor: color.neutral._400,
                                }}>
                                {'<No Tags Used>'}
                            </Text>
                        ))}
                    <ThemedTextInput
                        containerStyle={{ flex: 0 }}
                        value={textFilter}
                        onChangeText={setTextFilter}
                        style={{
                            color: resultLength === 0 ? color.text._700 : color.text._100,
                        }}
                        placeholder="Search Name..."
                    />
                    {(textFilter || tagFilter.length > 0) && (
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
