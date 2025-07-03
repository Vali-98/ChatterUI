import ThemedButton from '@components/buttons/ThemedButton'
import StringArrayEditor from '@components/input/StringArrayEditor'
import ThemedTextInput from '@components/input/ThemedTextInput'
import { db } from '@db'
import { AppSettings } from '@lib/constants/GlobalValues'
import { CharacterSorter } from '@lib/state/CharacterSorter'
import { TagHider } from '@lib/state/TagHider'
import { Theme } from '@lib/theme/ThemeManager'
import { characterTags, tags } from 'db/schema'
import { count, eq, notInArray } from 'drizzle-orm'
import { useLiveQuery } from 'drizzle-orm/expo-sqlite'
import { useFocusEffect } from 'expo-router'
import { useCallback } from 'react'
import { BackHandler, Text, View } from 'react-native'
import { useMMKVBoolean } from 'react-native-mmkv'
import Animated, { FadeInUp, FadeOutUp, LinearTransition } from 'react-native-reanimated'

import SortButton from './SortButton'

type CharacterListHeaderProps = {
    resultLength: number
}

const CharacterListHeader: React.FC<CharacterListHeaderProps> = ({ resultLength }) => {
    const { showSearch, setShowSearch, textFilter, setTextFilter, tagFilter, setTagFilter } =
        CharacterSorter.useSorter()

    const { color } = Theme.useTheme()
    const [showTags, setShowTags] = useMMKVBoolean(AppSettings.ShowTags)
    const hiddenTags = TagHider.useHiddenTags()

    const { data } = useLiveQuery(
        db
            .select({
                tag: tags.tag,
                tagCount: count(characterTags.tag_id),
            })
            .from(tags)
            .leftJoin(characterTags, eq(characterTags.tag_id, tags.id))
            .groupBy(tags.tag)
            .where(notInArray(tags.tag, hiddenTags)),
        [hiddenTags]
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
        <>
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
                    <SortButton type="modified" label="Recent" />
                    <SortButton type="name" label="Name" />
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
                            if (showTags) {
                                setTagFilter([])
                            }
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

            <Animated.View layout={LinearTransition}>
                {showSearch && (
                    <Animated.View
                        entering={FadeInUp}
                        exiting={FadeOutUp}
                        style={{ paddingHorizontal: 12, paddingBottom: 8, rowGap: 8 }}>
                        {showTags && data.length > 0 && (
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
                        )}
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
            </Animated.View>
        </>
    )
}

export default CharacterListHeader
