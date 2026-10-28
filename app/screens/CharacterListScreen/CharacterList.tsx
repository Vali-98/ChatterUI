import { usePathname } from 'expo-router'
import { useMemo, useState } from 'react'
import { View } from 'react-native'
import Animated, { LinearTransition } from 'react-native-reanimated'
import { useShallow } from 'zustand/react/shallow'

import GuideHost from '@components/guides/GuideHost'
import GuideTarget from '@components/guides/GuideTarget'
import Drawer from '@components/views/Drawer'
import HeaderButton from '@components/views/HeaderButton'
import HeaderTitle from '@components/views/HeaderTitle'
import { useLiveQueryAsync } from '@lib/hooks/liveQuery'
import { Characters, CharacterCardSummary } from '@lib/state/characters'
import { useCharacterSortStore } from '@lib/state/characters/sortStore'
import { TagHider } from '@lib/state/TagHider'

import CharacterListHeader from './CharacterListHeader'
import CharacterListing from './CharacterListing'
import CharacterNewMenu from './CharacterNewMenu'
import CharactersEmpty from './CharactersEmpty'
import CharactersSearchEmpty from './CharactersSearchEmpty'

const PAGE_SIZE = 30

const CharacterList: React.FC = () => {
    const [isLoading, setIsLoading] = useState(false)
    const { sortBy, sortDirection, tagFilter, textFilter } = useCharacterSortStore(
        useShallow((state) => ({
            sortBy: state.searchType,
            sortDirection: state.searchOrder,
            tagFilter: state.tagFilter,
            textFilter: state.textFilter,
        }))
    )
    const hiddenTags = TagHider.useHiddenTags()
    const [pages, setPages] = useState(3)
    const [previousLength, setPreviousLength] = useState(0)
    const { data, updatedAt } = useLiveQueryAsync(
        Characters.db.live.cardListWindow({
            type: 'character',
            sortBy: sortBy,
            sortDirection: sortDirection,
            limit: PAGE_SIZE * pages,
            offset: 0,
            searchText: textFilter,
            includedTags: tagFilter,
            hiddenTags: hiddenTags,
        }),
        {
            key: [
                'character-list',
                sortBy,
                sortDirection,
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

    const characterList: CharacterCardSummary[] = useMemo(() => {
        return data.map((item) => ({
            ...item,
            latestChatId: item.chats[0]?.id,
            latestSwipeText: item.chats[0]?.messages[0]?.swipes[0]?.swipe,
            latestMessageName: item.chats[0]?.messages[0]?.name,
            last_modified: item.last_modified ?? 0,
            tags: item.tags.map((item) => item.tag.tag),
        }))
    }, [data])

    // do not render when not shown, optimizes some rerenders
    const settingsOpen = Drawer.useDrawerStore((state) => !!state.values[Drawer.ID.SETTINGS])
    const path = usePathname()
    if (path !== '/') return

    return (
        <View style={{ flex: 1, paddingTop: 8 }}>
            <GuideHost id="main-ui" enabled={!settingsOpen} />
            <HeaderTitle />
            <HeaderButton
                headerLeft={() => (
                    <GuideTarget id="main.menu">
                        <Drawer.Button drawerID={Drawer.ID.SETTINGS} />
                    </GuideTarget>
                )}
                headerRight={() => (
                    <GuideTarget id="main.import">
                        <CharacterNewMenu isLoading={isLoading} setIsLoading={setIsLoading} />
                    </GuideTarget>
                )}
            />

            <CharacterListHeader resultLength={characterList.length} />
            <GuideTarget id="main.characters" style={{ flex: 1 }}>
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
                            isLoading={isLoading}
                            setIsLoading={setIsLoading}
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
            </GuideTarget>

            {characterList.length === 0 && data.length !== 0 && updatedAt && (
                <CharactersSearchEmpty />
            )}
        </View>
    )
}

export default CharacterList
