import { Characters, Logger } from '@globals'
import { useRouter, Stack, usePathname } from 'expo-router'
import { useEffect, useState } from 'react'
import { SafeAreaView, ScrollView } from 'react-native'
import { Gesture, GestureDetector } from 'react-native-gesture-handler'
import { runOnJS } from 'react-native-reanimated'

import CharacterListing from './CharacterListing'
import CharacterNewMenu from './CharacterNewMenu'
import CharactersEmpty from './CharactersEmpty'

type CharInfo = {
    name: string
    id: number
    image_id: number
    tags: string[]
}

const CharacterList = () => {
    const router = useRouter()

    const [characterList, setCharacterList] = useState<CharInfo[]>([])
    const [nowLoading, setNowLoading] = useState(false)

    const goBack = () => router.back()

    const gesture = Gesture.Fling()
        .direction(1)
        .onEnd(() => {
            runOnJS(goBack)()
        })

    const getCharacterList = async () => {
        try {
            const list = await Characters.db.query.cardList('character')
            setCharacterList(list)
        } catch (error) {
            Logger.log(`Could not retrieve characters.\n${error}`, true)
        }
    }

    useEffect(() => {
        getCharacterList()
    }, [usePathname()])

    return (
        <GestureDetector gesture={gesture}>
            <SafeAreaView style={{ paddingVertical: 16, paddingHorizontal: 8, flex: 1 }}>
                <Stack.Screen
                    options={{
                        title: 'Characters',
                        headerRight: () => (
                            <CharacterNewMenu
                                nowLoading={nowLoading}
                                setNowLoading={setNowLoading}
                                getCharacterList={getCharacterList}
                            />
                        ),
                    }}
                />

                {characterList.length === 0 && <CharactersEmpty />}

                {characterList.length !== 0 && (
                    <ScrollView>
                        {characterList.map((character, index) => (
                            <CharacterListing
                                key={character.id}
                                index={index}
                                character={character}
                                nowLoading={nowLoading}
                                setNowLoading={setNowLoading}
                            />
                        ))}
                    </ScrollView>
                )}
            </SafeAreaView>
        </GestureDetector>
    )
}

export default CharacterList
