import { FontAwesome, Ionicons } from '@expo/vector-icons'
import { Characters, Style } from '@globals'
import { useLiveQuery } from 'drizzle-orm/expo-sqlite'
import { Stack } from 'expo-router'
import { useState } from 'react'
import {
    SafeAreaView,
    View,
    Text,
    StyleSheet,
    FlatList,
    TouchableOpacity,
    TextInput,
} from 'react-native'
import Animated, {
    FadeInUp,
    FadeOutUp,
    SlideInRight,
    ZoomIn,
    ZoomInDown,
    ZoomInUp,
    ZoomOut,
} from 'react-native-reanimated'

import CharacterListing from './CharacterListing'
import CharacterNewMenu from './CharacterNewMenu'
import CharactersEmpty from './CharactersEmpty'

type CharInfo = {
    name: string
    id: number
    image_id: number
    last_modified: number
    tags: string[]
    latestSwipe?: string
    latestName?: string
    latestChat?: number
}

enum SortType {
    RECENT_DESC,
    RECENT_ASC,
    ALPHABETICAL_ASC,
    ALPHABETICAL_DESC,
}

const sortModified = (item1: CharInfo, item2: CharInfo) => {
    return item2.last_modified - item1.last_modified
}

const sortAlphabetical = (item1: CharInfo, item2: CharInfo) => {
    return -item2.name.localeCompare(item1.name)
}

const sortList = (sortType: SortType) => {
    if (sortType === SortType.ALPHABETICAL_ASC) return sortAlphabetical
    else return sortModified
}

type SortButtonProps = {
    sortType: SortType
    currentSortType: SortType
    label: string
    onPress: () => void | Promise<void>
}

const SortButton: React.FC<SortButtonProps> = ({ sortType, currentSortType, label, onPress }) => {
    return (
        <TouchableOpacity
            onPress={onPress}
            style={sortType === currentSortType ? styles.sortButtonActive : styles.sortButton}>
            <Text
                style={
                    sortType === currentSortType
                        ? styles.sortButtonTextActive
                        : styles.sortButtonText
                }>
                {label}
            </Text>
        </TouchableOpacity>
    )
}

type CharacterListProps = {
    showHeader: boolean
}

const CharacterList: React.FC<CharacterListProps> = ({ showHeader }) => {
    'use no memo'
    // const [characterList, setCharacterList] = useState<CharInfo[]>([])
    const [nowLoading, setNowLoading] = useState(false)
    const [showSearch, setShowSearch] = useState(false)
    const [showMenu, setShowMenu] = useState(false)
    const [textFilter, setTextFilter] = useState('')

    const [sortType, setSortType] = useState<SortType>(SortType.RECENT_DESC)
    const { data } = useLiveQuery(Characters.db.query.cardListQuery('character', 'modified'))

    const characterList: CharInfo[] = data
        .map((item) => ({
            ...item,
            latestChat: item.chats[0]?.id,
            latestSwipe: item.chats[0]?.messages[0]?.swipes[0]?.swipe,
            latestName: item.chats[0]?.messages[0]?.name,
            last_modified: item.last_modified ?? 0,
            tags: item.tags.map((item) => item.tag.tag),
        }))
        .sort(sortList(sortType ?? SortType.RECENT_DESC))
        .filter((item) => !textFilter || item.name.toLowerCase().includes(textFilter.toLowerCase()))

    return (
        <SafeAreaView style={{ paddingVertical: 16, paddingHorizontal: 8, flex: 1 }}>
            <Stack.Screen
                options={{
                    title: '',
                    ...(showHeader
                        ? {
                              headerRight: () => (
                                  <CharacterNewMenu
                                      nowLoading={nowLoading}
                                      setNowLoading={setNowLoading}
                                      setShowMenu={setShowMenu}
                                      showMenu={showMenu}
                                  />
                              ),
                          }
                        : {}),
                }}
            />
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
                    <Text style={{ color: Style.getColor('primary-text2'), fontSize: 16 }}>
                        Sort By
                    </Text>
                    <SortButton
                        sortType={SortType.RECENT_DESC}
                        currentSortType={sortType}
                        label="Recent"
                        onPress={() => {
                            setSortType(SortType.RECENT_DESC)
                        }}
                    />
                    <SortButton
                        sortType={SortType.ALPHABETICAL_ASC}
                        currentSortType={sortType}
                        label="A-z"
                        onPress={() => {
                            setSortType(SortType.ALPHABETICAL_ASC)
                        }}
                    />
                </View>
                {showSearch && (
                    <Animated.View entering={ZoomIn} exiting={ZoomOut}>
                        <TouchableOpacity>
                            <Ionicons
                                name="close"
                                color={Style.getColor('primary-text2')}
                                size={26}
                                onPress={() => {
                                    if (showSearch) setTextFilter('')
                                    setShowSearch(!showSearch)
                                }}
                            />
                        </TouchableOpacity>
                    </Animated.View>
                )}
                {!showSearch && (
                    <Animated.View entering={ZoomIn} exiting={ZoomOut}>
                        <TouchableOpacity>
                            <FontAwesome
                                name="search"
                                color={Style.getColor('primary-text2')}
                                size={26}
                                onPress={() => {
                                    if (showSearch) setTextFilter('')
                                    setShowSearch(!showSearch)
                                }}
                            />
                        </TouchableOpacity>
                    </Animated.View>
                )}
            </View>
            {showSearch && (
                <Animated.View
                    style={{ paddingHorizontal: 12, paddingVertical: 8 }}
                    entering={FadeInUp.duration(150).withInitialValues({
                        transform: [{ translateY: -20 }],
                    })}
                    exiting={FadeOutUp.duration(100)}>
                    <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                        <TextInput
                            autoFocus
                            placeholder="Search Name..."
                            placeholderTextColor={Style.getColor('primary-text3')}
                            value={textFilter}
                            style={{
                                ...styles.searchInput,
                                color: Style.getColor(
                                    characterList.length === 0 ? 'primary-text2' : 'primary-text1'
                                ),
                            }}
                            onChangeText={setTextFilter}
                        />
                    </View>
                </Animated.View>
            )}

            {characterList.length === 0 && <CharactersEmpty />}

            {characterList.length !== 0 && (
                <FlatList
                    showsHorizontalScrollIndicator={false}
                    data={characterList}
                    keyExtractor={(item) => item.id.toString()}
                    renderItem={({ item, index }) => (
                        <CharacterListing
                            index={index}
                            character={item}
                            nowLoading={nowLoading}
                            showTags={false}
                            setNowLoading={setNowLoading}
                        />
                    )}
                />
            )}
        </SafeAreaView>
    )
}

export default CharacterList

const styles = StyleSheet.create({
    sortButton: {
        paddingHorizontal: 16,
        paddingVertical: 8,
        backgroundColor: Style.getColor('primary-surface2'),
        borderRadius: 16,
    },

    sortButtonText: {
        color: Style.getColor('primary-text2'),
    },

    sortButtonActive: {
        paddingHorizontal: 16,
        paddingVertical: 8,
        backgroundColor: Style.getColor('primary-surface3'),
        borderRadius: 16,
    },

    sortButtonTextActive: {
        color: Style.getColor('primary-text1'),
    },

    searchInput: {
        borderRadius: 8,
        flex: 1,
        paddingVertical: 2,
        paddingHorizontal: 12,
        borderColor: Style.getColor('primary-brand'),
        borderWidth: 2,
    },
})
