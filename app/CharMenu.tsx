import TextBoxModal from '@components/TextBoxModal'
import { FontAwesome } from '@expo/vector-icons'
import { Color, Global, Characters, Chats } from '@globals'
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
import { useMMKVString, useMMKVObject } from 'react-native-mmkv'

const CharMenu = () => {
    const router = useRouter()

    //const [currentChat, setCurrentChat] = useMMKVString(Global.CurrentChat)
    const [currentCard, setCurrentCard] = useMMKVObject(Global.CurrentCharacterCard)
    const [charName, setCharName] = useMMKVString(Global.CurrentCharacter)
    //const [messages, setMessages] = useMMKVObject(Global.Messages)
    const [characterList, setCharacterList] = useState<Array<string>>([])
    const [showNewChar, setShowNewChar] = useState<boolean>(false)
    const [showDownload, setShowDownload] = useState(false)
    const [nowLoading, setNowLoading] = useState(false)

    const loadChat = Chats.useChat((state) => state.load)

    const getCharacterList = async () => {
        await Characters.getCardList()
            .then((list: Array<string>) => {
                setCharacterList(list)
            })
            .catch((error) => console.log(`Could not retrieve characters.\n${error}`))
    }

    const setCurrentCharacter = async (character: string) => {
        if (nowLoading) return
        setNowLoading(true)
        setCharName(character)

        Chats.getNewest(character).then(async (filename) => {
            //setCurrentChat(filename)
            if (!filename) return
            await loadChat(character, filename)
            await Characters.getCard(character).then((data) => {
                if (data) setCurrentCard(JSON.parse(data))
            })
            router.back()
        })
    }

    useEffect(() => {
        getCharacterList()
    }, [])

    return (
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
                                <FontAwesome name="cloud-download" size={28} color={Color.Button} />
                            </TouchableOpacity>

                            <TouchableOpacity
                                style={styles.headerButtonRight}
                                onPress={() =>
                                    Characters.importCharacterFromImage().then(() =>
                                        getCharacterList()
                                    )
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
                onConfirm={(text) => {
                    Characters.createCard(text).then(() => {
                        setCharName(text)
                        router.push(`/CharInfo`)
                        getCharacterList()
                    })
                }}
            />

            <TextBoxModal
                title="Enter Character Hub Link"
                booleans={[showDownload, setShowDownload]}
                onConfirm={(text) =>
                    Characters.importCharacterFromRemote(text).then(() => {
                        getCharacterList()
                    })
                }
            />

            <ScrollView>
                {characterList.map((character, index) => (
                    <TouchableOpacity
                        disabled={nowLoading}
                        style={styles.longButton}
                        key={index}
                        onPress={() => setCurrentCharacter(character)}>
                        <Image
                            source={{
                                uri: `${FS.documentDirectory}characters/${character}/${character}.png`,
                            }}
                            style={styles.avatar}
                        />
                        <Text style={styles.nametag}>{character}</Text>
                        {nowLoading && character == charName && (
                            <ActivityIndicator color={Color.White} style={{ paddingLeft: 8 }} />
                        )}
                    </TouchableOpacity>
                ))}
            </ScrollView>
        </SafeAreaView>
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
