import { usePathname } from 'expo-router'
import { useMemo, useState } from 'react'
import { View } from 'react-native'
import Animated, { LinearTransition } from 'react-native-reanimated'
import { useShallow } from 'zustand/react/shallow'

import Drawer from '@components/views/Drawer'
import HeaderButton from '@components/views/HeaderButton'
import HeaderTitle from '@components/views/HeaderTitle'
import { useLiveQueryAsync } from '@lib/hooks/liveQuery'
import { Characters, CharInfo } from '@lib/state/characters'
import { CharacterSorter } from '@lib/state/CharacterSorter'
import { TagHider } from '@lib/state/TagHider'

import CharacterListHeader from './CharacterListHeader'
import CharacterListing from './CharacterListing'
import CharacterNewMenu from './CharacterNewMenu'
import CharactersEmpty from './CharactersEmpty'
import CharactersSearchEmpty from './CharactersSearchEmpty'

const PAGE_SIZE = 30

const CharacterList: React.FC = () => {
    const [nowLoading, setNowLoading] = useState(false)
    const { searchType, searchOrder, tagFilter, textFilter } = CharacterSorter.useSorterStore(
        useShallow((state) => ({
            searchType: state.searchType,
            searchOrder: state.searchOrder,
            tagFilter: state.tagFilter,
            textFilter: state.textFilter,
        }))
    )
    const hiddenTags = TagHider.useHiddenTags()
    const [pages, setPages] = useState(3)
    const [previousLength, setPreviousLength] = useState(0)
    const { data, updatedAt } = useLiveQueryAsync(
        Characters.db.query.cardListQueryWindow(
            'character',
            searchType,
            searchOrder,
            PAGE_SIZE * pages,
            0,
            textFilter,
            tagFilter,
            hiddenTags
        ),
        {
            key: [
                'character-list',
                searchType,
                searchOrder,
                textFilter,
                tagFilter,
                hiddenTags,
                pages,
            ],
            watch: [
                { table: 'characters' },
                { table: 'characterLinks' },
                { table: 'character_tags' },
                { table: 'tags' },
                { table: 'chats' },
                { table: 'chat_entries' },
                { table: 'chat_swipes' },
            ],
        }
    )

    const characterList: CharInfo[] = useMemo(() => {
        return data.map((item) => ({
            ...item,
            latestChat: item.chats[0]?.id,
            latestSwipe: item.chats[0]?.messages[0]?.swipes[0]?.swipe,
            latestName: item.chats[0]?.messages[0]?.name,
            last_modified: item.last_modified ?? 0,
            tags: item.tags.map((item) => item.tag.tag),
        }))
    }, [data])

    // do not render when not shown, optimizes some rerenders
    const path = usePathname()
    if (path !== '/') return

    return (
        <View style={{ flex: 1, paddingTop: 8 }}>
            <HeaderTitle />
            <HeaderButton
                headerLeft={() => <Drawer.Button drawerID={Drawer.ID.SETTINGS} />}
                headerRight={() => (
                    <CharacterNewMenu nowLoading={nowLoading} setNowLoading={setNowLoading} />
                )}
            />

            <CharacterListHeader resultLength={characterList.length} />
            <View style={{ flex: 1 }}>
                <Animated.FlatList
                    layout={LinearTransition}
                    itemLayoutAnimation={LinearTransition}
                    showsVerticalScrollIndicator={false}
                    contentContainerStyle={{ rowGap: 16 }}
                    data={characterList}
                    keyExtractor={(item) => item.id.toString()}
                    renderItem={({ item }) => (
                        <CharacterListing
                            character={item}
                            nowLoading={nowLoading}
                            setNowLoading={setNowLoading}
                        />
                    )}
                    onEndReachedThreshold={1}
                    onEndReached={() => {
                        if (previousLength === data.length) {
                            return
                        }
                        setPreviousLength(data.length)
                        setPages(pages + 1)
                    }}
                    windowSize={3}
                    onStartReachedThreshold={0.1}
                    onStartReached={() => {
                        if (pages !== 3) setPages(3)
                    }}
                    ListEmptyComponent={() => data.length === 0 && updatedAt && <CharactersEmpty />}
                />
            </View>

            {characterList.length === 0 && data.length !== 0 && updatedAt && (
                <CharactersSearchEmpty />
            )}
        </View>
    )
}

export default CharacterList
