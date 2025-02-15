import FadeDownView from '@components/views/FadeDownView'
import HeaderButton from '@components/views/HeaderButton'
import HeaderTitle from '@components/views/HeaderTitle'
import { Characters, CharInfo } from '@lib/state/Characters'
import { useLiveQuery } from 'drizzle-orm/expo-sqlite'
import { useState } from 'react'
import { SafeAreaView } from 'react-native'
import Animated, { LinearTransition } from 'react-native-reanimated'

import CharacterListHeader from './CharacterListHeader'
import CharacterListing from './CharacterListing'
import CharacterNewMenu from './CharacterNewMenu'
import CharactersEmpty from './CharactersEmpty'
import CharactersSearchEmpty from './CharactersSearchEmpty'
import { sortList, SortType } from './SortButton'

type CharacterListProps = {
    showHeader: boolean
}

const CharacterList: React.FC<CharacterListProps> = ({ showHeader }) => {
    const [nowLoading, setNowLoading] = useState(false)
    const [showMenu, setShowMenu] = useState(false)
    const [textFilter, setTextFilter] = useState('')

    const [sortType, setSortType] = useState<SortType>(SortType.RECENT_DESC)
    const { data, updatedAt } = useLiveQuery(
        Characters.db.query.cardListQuery('character', 'modified')
    )
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
            <HeaderTitle />
            <HeaderButton
                headerRight={() =>
                    showHeader && (
                        <CharacterNewMenu
                            nowLoading={nowLoading}
                            setNowLoading={setNowLoading}
                            setShowMenu={setShowMenu}
                            showMenu={showMenu}
                        />
                    )
                }
            />

            {data.length === 0 && updatedAt && <CharactersEmpty />}

            {data.length !== 0 && (
                <FadeDownView duration={100}>
                    <CharacterListHeader
                        sortType={sortType}
                        setSortType={setSortType}
                        textFilter={textFilter}
                        setTextFilter={setTextFilter}
                        resultLength={characterList.length}
                    />
                    <Animated.FlatList
                        itemLayoutAnimation={LinearTransition}
                        showsVerticalScrollIndicator={false}
                        contentContainerStyle={{ rowGap: 8 }}
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
                </FadeDownView>
            )}

            {characterList.length === 0 && data.length !== 0 && updatedAt && (
                <CharactersSearchEmpty />
            )}
        </SafeAreaView>
    )
}

export default CharacterList
