import AnimatedView from '@components/AnimatedView'
import TextBoxModal from '@components/TextBoxModal'
import { AntDesign, FontAwesome, Ionicons } from '@expo/vector-icons'
import { Characters, Chats, Logger, Style } from '@globals'
import { useRouter, Stack, usePathname } from 'expo-router'
import { useEffect, useState } from 'react'
import {
    SafeAreaView,
    TouchableOpacity,
    ScrollView,
    Text,
    Image,
    StyleSheet,
    View,
    ActivityIndicator,
} from 'react-native'
import { Gesture, GestureDetector } from 'react-native-gesture-handler'
import { runOnJS } from 'react-native-reanimated'
import { useShallow } from 'zustand/react/shallow'

type CharInfo = {
    name: string
    id: number
    image_id: number
    tags: string[]
}

const CharMenu = () => {
    const router = useRouter()
    const { setCurrentCard, id } = Characters.useCharacterCard(
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
    const [loadedCharId, setLoadedCharId] = useState(id)

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
        setLoadedCharId(charId)

        try {
            await setCurrentCard(charId)
            setNowLoading(true)
            const returnedChatId = await Chats.db.query.chatNewestId(charId)
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
        setLoadedCharId(-1)
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
                            <AnimatedView
                                style={
                                    character.id === loadedCharId
                                        ? styles.longButtonSelectedContainer
                                        : styles.longButtonContainer
                                }
                                key={index}
                                dx={Math.min(500 + index * 200, 2000)}
                                tduration={Math.min(500 + index * 100, 1000)}
                                fade={0}
                                fduration={500}>
                                <TouchableOpacity
                                    style={styles.longButton}
                                    disabled={nowLoading}
                                    onPress={() => setCurrentCharacter(character.id)}>
                                    <Image
                                        source={{
                                            uri: Characters.getImageDir(character.image_id),
                                        }}
                                        style={styles.avatar}
                                    />
                                    <View>
                                        <Text style={styles.nametag}>{character.name}</Text>
                                        <View
                                            style={{
                                                paddingLeft: 16,
                                                flex: 1,
                                                flexDirection: 'row',
                                                flexWrap: 'wrap',
                                            }}>
                                            {character.tags.map((item, index) => (
                                                <Text
                                                    style={{
                                                        color: Style.getColor('primary-text2'),
                                                        fontSize: 12,
                                                        backgroundColor:
                                                            Style.getColor('primary-surface4'),
                                                        paddingHorizontal: 4,
                                                        paddingVertical: 2,
                                                        borderRadius: 4,
                                                        rowGap: 2,
                                                        columnGap: 4,
                                                    }}
                                                    key={index}>
                                                    {item}
                                                </Text>
                                            ))}
                                        </View>
                                    </View>
                                </TouchableOpacity>
                                <View>
                                    {nowLoading && character.id === loadedCharId ? (
                                        <ActivityIndicator
                                            color={Style.getColor('primary-text2')}
                                            style={{ paddingLeft: 8 }}
                                            size={28}
                                        />
                                    ) : (
                                        <TouchableOpacity
                                            style={styles.secondaryButton}
                                            onPress={async () => {
                                                setCurrentCharacter(character.id, true)
                                            }}
                                            disabled={nowLoading}>
                                            <AntDesign
                                                color={Style.getColor('primary-text2')}
                                                name="idcard"
                                                size={32}
                                            />
                                        </TouchableOpacity>
                                    )}
                                </View>
                            </AnimatedView>
                        ))}
                    </ScrollView>
                )}
            </SafeAreaView>
        </GestureDetector>
    )
}

export default CharMenu

const styles = StyleSheet.create({
    mainContainer: {
        paddingVertical: 16,
        paddingHorizontal: 8,
        flex: 1,
    },

    longButton: {
        flexDirection: 'row',
        flex: 1,
        padding: 8,
    },

    longButtonContainer: {
        backgroundColor: Style.getColor('primary-surface1'),
        borderColor: Style.getColor('primary-surface1'),
        borderWidth: 2,
        flexDirection: 'row',
        marginBottom: 8,
        justifyContent: 'space-between',
        alignItems: 'center',
        borderRadius: 8,
        flex: 1,
    },

    longButtonSelectedContainer: {
        backgroundColor: Style.getColor('primary-surface1'),
        borderColor: Style.getColor('primary-brand'),
        borderWidth: 2,
        flexDirection: 'row',
        marginBottom: 8,
        justifyContent: 'space-between',
        alignItems: 'center',
        borderRadius: 8,
        flex: 1,
    },

    secondaryButton: {
        paddingHorizontal: 12,
        paddingVertical: 20,
    },

    avatar: {
        width: 48,
        height: 48,
        borderRadius: 12,
        margin: 4,
        backgroundColor: Style.getColor('primary-surface2'),
    },

    nametag: {
        fontSize: 16,
        marginLeft: 20,
        color: Style.getColor('primary-text1'),
    },

    subtag: {
        fontSize: 16,
        marginLeft: 20,
        color: Style.getColor('primary-text2'),
    },

    headerButtonRight: {
        marginLeft: 20,
        marginRight: 4,
    },

    headerButtonContainer: {
        flexDirection: 'row',
    },
})
