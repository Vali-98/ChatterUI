import TextBoxModal from '@components/TextBoxModal'
import { FontAwesome, Ionicons } from '@expo/vector-icons'
import { Characters, Chats, Logger, Style } from '@globals'
import { useRouter, Stack, usePathname } from 'expo-router'
import { useEffect, useState } from 'react'
import { SafeAreaView, TouchableOpacity, ScrollView, Text, StyleSheet, View } from 'react-native'
import { Gesture, GestureDetector } from 'react-native-gesture-handler'
import { runOnJS } from 'react-native-reanimated'
import { useShallow } from 'zustand/react/shallow'

import CharacterListing from './CharacterListing'

type CharInfo = {
    name: string
    id: number
    image_id: number
    tags: string[]
}

const CharacterList = () => {
    const router = useRouter()
    const { setCurrentCard } = Characters.useCharacterCard(
        useShallow((state) => ({
            setCurrentCard: state.setCard,
            id: state.id,
        }))
    )
    const loadChat = Chats.useChat((state) => state.load)

    const [characterList, setCharacterList] = useState<CharInfo[]>([])
    const [showNewChar, setShowNewChar] = useState<boolean>(false)
    const [showDownload, setShowDownload] = useState(false)
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
    const setCurrentCharacter = async (charId: number, edit: boolean = false) => {
        if (nowLoading) return

        try {
            await setCurrentCard(charId)
            setNowLoading(true)
            const returnedChatId = await Chats.db.query.chatNewest(charId)
            let chatId = returnedChatId
            if (!chatId) {
                chatId = await Chats.db.mutate.createChat(charId)
            }
            if (!chatId) {
                Logger.log('Chat creation backup has failed! Please report.', true)
                return
            }

            await loadChat(chatId)

            setNowLoading(false)
            if (edit) router.push('/CharInfo')
            else router.back()
        } catch (error) {
            Logger.log(`Couldn't load character: ${error}`, true)
            setNowLoading(false)
        }
    }

    const handleCreateCharacter = async (text: string) => {
        if (!text) {
            Logger.log('Name Cannot Be Empty!', true)
            return
        }
        Characters.db.mutate.createCard(text).then(async (id) => {
            await setCurrentCharacter(id, true)
        })
    }

    useEffect(() => {
        getCharacterList()
    }, [usePathname()])

    return (
        <GestureDetector gesture={gesture}>
            <SafeAreaView style={styles.mainContainer}>
                <Stack.Screen
                    options={{
                        title: 'Characters',
                        headerRight: () => (
                            <View style={styles.headerButtonContainer}>
                                <TouchableOpacity
                                    style={styles.headerButtonRight}
                                    onPress={async () => {
                                        setShowDownload(true)
                                    }}>
                                    <FontAwesome
                                        name="cloud-download"
                                        size={28}
                                        color={Style.getColor('primary-text1')}
                                    />
                                </TouchableOpacity>

                                <TouchableOpacity
                                    style={styles.headerButtonRight}
                                    onPress={() =>
                                        Characters.importCharacterFromImage().then(async () => {
                                            getCharacterList()
                                        })
                                    }>
                                    <FontAwesome
                                        name="upload"
                                        size={28}
                                        color={Style.getColor('primary-text1')}
                                    />
                                </TouchableOpacity>

                                <TouchableOpacity
                                    style={styles.headerButtonRight}
                                    onPress={async () => {
                                        setShowNewChar(true)
                                    }}>
                                    <FontAwesome
                                        name="pencil"
                                        size={28}
                                        color={Style.getColor('primary-text1')}
                                    />
                                </TouchableOpacity>
                            </View>
                        ),
                    }}
                />

                <TextBoxModal
                    booleans={[showNewChar, setShowNewChar]}
                    title="[Creating Character]  Enter Name Below"
                    onConfirm={handleCreateCharacter}
                />

                <TextBoxModal
                    title="Enter Character Hub or Pygmalion Link"
                    booleans={[showDownload, setShowDownload]}
                    onConfirm={(text) =>
                        Characters.importCharacterFromRemote(text).then(() => {
                            getCharacterList()
                        })
                    }
                    showPaste
                />
                {characterList.length === 0 && (
                    <View style={{ ...styles.mainContainer, alignItems: 'center', marginTop: 30 }}>
                        <Ionicons
                            name="person-outline"
                            color={Style.getColor('primary-text2')}
                            size={60}
                        />
                        <Text
                            style={{
                                color: Style.getColor('primary-text2'),
                                marginTop: 16,
                                fontStyle: 'italic',
                                fontSize: 16,
                            }}>
                            No Characters Found. Try Importing Some!
                        </Text>
                    </View>
                )}

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

const styles = StyleSheet.create({
    mainContainer: {
        paddingVertical: 16,
        paddingHorizontal: 8,
        flex: 1,
    },

    headerButtonRight: {
        marginLeft: 20,
        marginRight: 4,
    },

    headerButtonContainer: {
        flexDirection: 'row',
    },
})
