import Drawer from '@components/views/Drawer'
import HeaderButton from '@components/views/HeaderButton'
import HeaderTitle from '@components/views/HeaderTitle'
import { CharacterSorter } from '@lib/state/CharacterSorter'
import { Characters, CharInfo } from '@lib/state/Characters'
import { TagHider } from '@lib/state/TagHider'
import { useLiveQuery } from 'drizzle-orm/expo-sqlite'
import { useState } from 'react'
import { SafeAreaView, View } from 'react-native'
import Animated from 'react-native-reanimated'

import CharacterListHeader from './CharacterListHeader'
import CharacterListing from './CharacterListing'
import CharacterNewMenu from './CharacterNewMenu'
import CharactersEmpty from './CharactersEmpty'
import CharactersSearchEmpty from './CharactersSearchEmpty'

type CharacterListProps = {
    showHeader: boolean
}

const PAGE_SIZE = 30

const CharacterList: React.FC<CharacterListProps> = ({ showHeader }) => {
    const [nowLoading, setNowLoading] = useState(false)
    const { showSearch, searchType, searchOrder, tagFilter, textFilter } =
        CharacterSorter.useSorter()
    const hiddenTags = TagHider.useHiddenTags()
    const [pages, setPages] = useState(3)
    const [previousLength, setPreviousLength] = useState(0)
    const { data, updatedAt } = useLiveQuery(
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
        [searchType, searchOrder, textFilter, tagFilter, hiddenTags, pages]
    )

    const characterList: CharInfo[] = data.map((item) => ({
        ...item,
        latestChat: item.chats[0]?.id,
        latestSwipe: item.chats[0]?.messages[0]?.swipes[0]?.swipe,
        latestName: item.chats[0]?.messages[0]?.name,
        last_modified: item.last_modified ?? 0,
        tags: item.tags.map((item) => item.tag.tag),
    }))

    return (
        <SafeAreaView style={{ paddingVertical: 16, paddingHorizontal: 8, flex: 1 }}>
            <HeaderTitle />
            <HeaderButton
                headerLeft={() => (
                    <Drawer.Button drawerID={Drawer.ID.SETTINGS} buttonStyle={{ width: 30 }} />
                )}
                headerRight={() => (
                    <CharacterNewMenu nowLoading={nowLoading} setNowLoading={setNowLoading} />
                )}
            />

            {data.length === 0 && !showSearch && updatedAt && <CharactersEmpty />}

            <View style={{ flex: 1 }}>
                <CharacterListHeader resultLength={characterList.length} />
                <Animated.FlatList
                    showsVerticalScrollIndicator={false}
                    contentContainerStyle={{ rowGap: 8 }}
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
                        setPages(3)
                    }}
                />
            </View>

            {characterList.length === 0 && data.length !== 0 && updatedAt && (
                <CharactersSearchEmpty />
            )}
        </SafeAreaView>
    )
}

export default CharacterList
