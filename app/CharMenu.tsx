import AnimatedView from '@components/AnimatedView'
import TextBoxModal from '@components/TextBoxModal'
import { AntDesign, FontAwesome, Ionicons } from '@expo/vector-icons'
import { Global, Characters, Chats, Logger, Style } from '@globals'
import { useRouter, Stack } from 'expo-router'
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
import { useMMKVString, useMMKVObject } from 'react-native-mmkv'
import { runOnJS } from 'react-native-reanimated'

const CharMenu = () => {
    const router = useRouter()

    //const [currentChat, setCurrentChat] = useMMKVString(Global.CurrentChat)
    const [currentCard, setCurrentCard] = useMMKVObject(Global.CurrentCharacterCard)
    const [charName, setCharName] = useMMKVString(Global.CurrentCharacter)
    const [userName, setUserName] = useMMKVString(Global.CurrentUser)
    //const [messages, setMessages] = useMMKVObject(Global.Messages)

    type CharInfo = {
        name: string
        n: number
    }

    const [characterList, setCharacterList] = useState<Array<CharInfo>>([])
    const [showNewChar, setShowNewChar] = useState<boolean>(false)
    const [showDownload, setShowDownload] = useState(false)
    const [nowLoading, setNowLoading] = useState(false)

    const loadChat = Chats.useChat((state) => state.load)

    const goBack = () => router.back()

    const gesture = Gesture.Fling()
        .direction(1)
        .onEnd(() => {
            runOnJS(goBack)()
        })
    const getCharacterList = async () => {
        await Characters.getCardList()
            .then(async (list: Array<string>) => {
                const data: Array<CharInfo> = []
                for (const name of list) {
                    const n = await await Chats.getNumber(name)
                    data.push({ name: name, n: n })
                }
                setCharacterList(data)
            })
            .catch((error) => Logger.log(`Could not retrieve characters.\n${error}`, true))
    }

    const setCurrentCharacter = async (character: string, edit: boolean = false) => {
        if (nowLoading) return
        setNowLoading(true)
        setCharName(character)

        Chats.getNewest(character)
            .then(async (filename) => {
                //setCurrentChat(filename)
                await Characters.getCard(character).then((data) => {
                    if (data) setCurrentCard(JSON.parse(data))
                })
                let file = filename
                if (!file) {
                    file = await Chats.createChat(character, userName ?? '')
                }
                if (!file) {
                    Logger.log('Chat creation backup has failed! Please report.', true)
                    return
                }
                await loadChat(character, file)

                setNowLoading(false)
                if (edit) router.push('/CharInfo')
                else router.back()
            })
            .catch((error: any) => {
                Logger.log(`Couldn't load character: ${error}`, true)
                setNowLoading(false)
            })
    }

    const handleCreateCharacter = async (text: string) => {
        if (!text) {
            Logger.log('Name Cannot Be Empty!', true)
            return
        }
        if (await Characters.exists(text)) {
            Logger.log('Character Name Already Exists', true)
            return
        }
        Characters.createCard(text).then(async () => {
            setCharName(text)
            router.push(`/CharInfo`)
            getCharacterList()
        })
    }

    useEffect(() => {
        getCharacterList()
    }, [])

    if (characterList.length === 0)
        return (
            <View style={{ ...styles.mainContainer, alignItems: 'center', marginTop: 30 }}>
                <Ionicons name="person-outline" color={Style.getColor('primary-text2')} size={60} />
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
        )

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
                    showPaste={true}
                />

                <ScrollView>
                    {characterList.map((character, index) => (
                        <AnimatedView
                            style={
                                character.name === charName
                                    ? styles.longButtonSelectedContainer
                                    : styles.longButtonContainer
                            }
                            key={index}
                            dx={Math.min(500 + index * 200, 2000)}
                            tduration={Math.min(500 + index * 100, 1000)}
                            fade={0}
                            fduration={500}>
                            <TouchableOpacity
                                style={{
                                    flexDirection: 'row',
                                    alignItems: 'center',
                                    justifyContent: 'space-between',
                                }}
                                disabled={nowLoading}
                                onPress={() => setCurrentCharacter(character.name)}>
                                <View style={styles.longButton}>
                                    <Image
                                        source={{
                                            uri: Characters.getImageDir(character.name),
                                        }}
                                        style={styles.avatar}
                                    />
                                    <View>
                                        <Text style={styles.nametag}>{character.name}</Text>
                                        <Text style={styles.subtag}>Chats: {character.n}</Text>
                                    </View>
                                </View>
                                {nowLoading && character.name == charName ? (
                                    <ActivityIndicator
                                        color={Style.getColor('primary-text2')}
                                        style={{ paddingLeft: 8 }}
                                        size={28}
                                    />
                                ) : (
                                    <TouchableOpacity
                                        onPress={() => setCurrentCharacter(character.name, true)}>
                                        <AntDesign
                                            color={Style.getColor('primary-text2')}
                                            name="idcard"
                                            size={32}
                                        />
                                    </TouchableOpacity>
                                )}
                            </TouchableOpacity>
                        </AnimatedView>
                    ))}
                </ScrollView>
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
        paddingVertical: 8,
        padding: 8,
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
        paddingVertical: 8,
        padding: 8,
        flex: 1,
    },

    avatar: {
        width: 48,
        height: 48,
        borderRadius: 12,
        margin: 4,
        backgroundColor: 'gray',
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
