import AnimatedView from '@components/AnimatedView'
import TextBoxModal from '@components/TextBoxModal'
import { FontAwesome } from '@expo/vector-icons'
import { Color, Global, Characters, Chats, Logger } from '@globals'
import * as FS from 'expo-file-system'
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
    const [characterList, setCharacterList] = useState<Array<string>>([])
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
            .then((list: Array<string>) => {
                setCharacterList(list)
            })
            .catch((error) => Logger.log(`Could not retrieve characters.\n${error}`, true))
    }

    const setCurrentCharacter = async (character: string) => {
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

                router.back()
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
                                        color={Color.Button}
                                    />
                                </TouchableOpacity>

                                <TouchableOpacity
                                    style={styles.headerButtonRight}
                                    onPress={() =>
                                        Characters.importCharacterFromImage().then(async () => {
                                            getCharacterList()
                                        })
                                    }>
                                    <FontAwesome name="upload" size={28} color={Color.Button} />
                                </TouchableOpacity>

                                <TouchableOpacity
                                    style={styles.headerButtonRight}
                                    onPress={async () => {
                                        setShowNewChar(true)
                                    }}>
                                    <FontAwesome name="pencil" size={28} color={Color.Button} />
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
                            key={index}
                            dx={Math.min(500 + index * 200, 2000)}
                            tduration={Math.min(500 + index * 100, 1000)}
                            fade={0}
                            fduration={500}
                            style={{ flex: 1 }}>
                            <TouchableOpacity
                                disabled={nowLoading}
                                style={styles.longButton}
                                onPress={() => setCurrentCharacter(character)}>
                                <Image
                                    source={{
                                        uri: `${FS.documentDirectory}characters/${character}/${character}.png`,
                                    }}
                                    style={styles.avatar}
                                />
                                <Text style={styles.nametag}>{character}</Text>
                                {nowLoading && character == charName && (
                                    <ActivityIndicator
                                        color={Color.White}
                                        style={{ paddingLeft: 8 }}
                                    />
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
        paddingHorizontal: 16,
        backgroundColor: Color.Background,
        flex: 1,
    },

    longButton: {
        backgroundColor: Color.Container,
        flexDirection: 'row',
        padding: 12,
        borderRadius: 8,
        alignItems: 'center',
        marginVertical: 4,
    },

    avatar: {
        width: 48,
        height: 48,
        borderRadius: 24,
        margin: 4,
    },

    nametag: {
        fontSize: 16,
        marginLeft: 20,
        color: Color.Text,
    },

    headerButtonRight: {
        marginLeft: 20,
        marginRight: 4,
    },

    headerButtonContainer: {
        flexDirection: 'row',
    },

    input: {
        minWidth: 200,
        borderWidth: 1,
        borderColor: '#ccc',
        borderRadius: 12,
        paddingHorizontal: 8,
        paddingVertical: 8,
        margin: 8,
    },
})
