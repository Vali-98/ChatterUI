import TextBoxModal from '@components/TextBoxModal';
import { FontAwesome } from '@expo/vector-icons';
import { Color, Global, Characters } from '@globals';
import * as FS from 'expo-file-system';
import { useRouter, Stack } from 'expo-router';
import { useEffect, useState } from 'react';
import {
    SafeAreaView,
    TouchableOpacity,
    ScrollView,
    Text,
    Image,
    StyleSheet,
    View,
    ToastAndroid,
} from 'react-native';
import { useMMKVString } from 'react-native-mmkv';

const CharMenu = () => {
    const router = useRouter();
    const [characterList, setCharacterList] = useState([]);
    const [charName, setCharName] = useMMKVString(Global.CurrentCharacter);
    const [showNewChar, setShowNewChar] = useState(false);
    const [showDownload, setShowDownload] = useState(false);

    const getCharacterList = async () => {
        await Characters.getCardList()
            .then((list) => {
                setCharacterList(list);
            })
            .catch((error) => console.log(`Could not retrieve characters.\n${error}`));
    };

    useEffect(() => {
        getCharacterList();
    }, []);

    return (
        <SafeAreaView style={styles.mainContainer}>
            <Stack.Screen
                options={{
                    headerRight: () => (
                        <View style={styles.headerButtonContainer}>
                            <TouchableOpacity
                                style={styles.headerButtonRight}
                                onPress={async () => {
                                    setShowDownload(true);
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
                                    setShowNewChar(true);
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
                        setCharName(text);
                        router.push('CharInfo');
                        getCharacterList();
                    });
                }}
            />

            <TextBoxModal
                title="Enter Character Hub Link"
                booleans={[showDownload, setShowDownload]}
                onConfirm={(text) =>
                    Characters.importCharacterFromRemote(text).then(() => {
                        getCharacterList();
                    })
                }
            />

            <ScrollView style={styles.characterContainer}>
                {characterList.map((character, index) => (
                    <TouchableOpacity
                        style={styles.longButton}
                        key={index}
                        onPress={() => {
                            setCharName(character);
                            router.back();
                        }}>
                        <Image
                            source={{
                                uri: `${FS.documentDirectory}characters/${character}/${character}.png`,
                            }}
                            style={styles.avatar}
                        />
                        <Text style={styles.nametag}>{character}</Text>
                    </TouchableOpacity>
                ))}
            </ScrollView>
        </SafeAreaView>
    );
};

export default CharMenu;

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
});
