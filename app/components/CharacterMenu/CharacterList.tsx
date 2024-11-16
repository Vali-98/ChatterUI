import { CharInfo } from '@constants/Characters'
import { AntDesign } from '@expo/vector-icons'
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
    LinearTransition,
    ZoomIn,
    ZoomOut,
} from 'react-native-reanimated'

import CharacterListing from './CharacterListing'
import CharacterNewMenu from './CharacterNewMenu'
import CharactersEmpty from './CharactersEmpty'

enum SortType {
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

const sortList = {
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

type SortButtonProps = {
    sortTypes: SortType[]
    currentSortType: SortType
    label: string
    onPress: () => void | Promise<void>
}

const SortButton: React.FC<SortButtonProps> = ({ sortTypes, currentSortType, label, onPress }) => {
    const isCurrent = sortTypes.includes(currentSortType)
    const isAsc = sortTypes[0] === currentSortType
    return (
        <TouchableOpacity
            onPress={onPress}
            style={isCurrent ? styles.sortButtonActive : styles.sortButton}>
            {isCurrent && (
                <AntDesign
                    size={14}
                    name={isAsc ? 'caretup' : 'caretdown'}
                    color={Style.getColor('primary-text1')}
                />
            )}
            <Text style={isCurrent ? styles.sortButtonTextActive : styles.sortButtonText}>
                {label}
            </Text>
        </TouchableOpacity>
    )
}

type CharacterListProps = {
    showHeader: boolean
}

const CharacterList: React.FC<CharacterListProps> = ({ showHeader }) => {
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
        .sort(sortList[sortType ?? SortType.RECENT_DESC])
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

            {characterList.length === 0 && <CharactersEmpty />}

            {characterList.length !== 0 && (
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
                            <Text style={{ color: Style.getColor('primary-text2'), fontSize: 16 }}>
                                Sort By
                            </Text>
                            <SortButton
                                sortTypes={[SortType.RECENT_ASC, SortType.RECENT_DESC]}
                                currentSortType={sortType}
                                label="Recent"
                                onPress={() => {
                                    setSortType(recentStateMap[sortType])
                                }}
                            />
                            <SortButton
                                sortTypes={[SortType.ALPHABETICAL_ASC, SortType.ALPHABETICAL_DESC]}
                                currentSortType={sortType}
                                label="Name"
                                onPress={() => {
                                    setSortType(alphabeticalStateMap[sortType])
                                }}
                            />
                        </View>
                        {showSearch && (
                            <Animated.View entering={ZoomIn} exiting={ZoomOut}>
                                <TouchableOpacity>
                                    <AntDesign
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
                                    <AntDesign
                                        name="search1"
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
                                            characterList.length === 0
                                                ? 'primary-text2'
                                                : 'primary-text1'
                                        ),
                                    }}
                                    onChangeText={setTextFilter}
                                />
                            </View>
                        </Animated.View>
                    )}
                    <Animated.FlatList
                        itemLayoutAnimation={LinearTransition}
                        showsVerticalScrollIndicator={false}
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
                </View>
            )}
        </SafeAreaView>
    )
}

export default CharacterList

const styles = StyleSheet.create({
    sortButton: {
        alignItems: 'center',
        flexDirection: 'row',
        paddingHorizontal: 16,
        paddingVertical: 8,
        backgroundColor: Style.getColor('primary-surface2'),
        borderRadius: 16,
    },

    sortButtonActive: {
        alignItems: 'center',
        flexDirection: 'row',
        paddingHorizontal: 16,
        paddingVertical: 8,
        backgroundColor: Style.getColor('primary-surface3'),
        borderRadius: 16,
    },

    sortButtonText: {
        color: Style.getColor('primary-text2'),
    },

    sortButtonTextActive: {
        marginLeft: 4,
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
