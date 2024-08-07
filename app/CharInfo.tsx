import { FontAwesome } from '@expo/vector-icons'
import { Global, Characters, Logger, LlamaTokenizer, Style } from '@globals'
import * as DocumentPicker from 'expo-document-picker'
import { Stack, useRouter } from 'expo-router'
import { useState, useEffect } from 'react'
import {
    View,
    Text,
    SafeAreaView,
    StyleSheet,
    Image,
    TouchableOpacity,
    Alert,
    ScrollView,
    TextInput,
} from 'react-native'
import { useMMKVString, useMMKVObject } from 'react-native-mmkv'

import { useAutosave } from 'react-autosave'
import { CharacterCardV2 } from '@constants/Characters'
import { RecentMessages } from '@constants/RecentMessages'
import AnimatedView from '@components/AnimatedView'

const CharInfo = () => {
    const router = useRouter()
    const [charName, setCharName] = useMMKVString(Global.CurrentCharacter)
    const [currentCard, setCurrentCard] = useMMKVObject<CharacterCardV2>(
        Global.CurrentCharacterCard
    )
    const [characterCard, setCharacterCard] = useState<CharacterCardV2 | undefined>(currentCard)

    const imageDir = Characters.getImageDir(charName ?? '')

    const [imageSource, setImageSource] = useState({
        uri: imageDir,
    })

    const handleImageError = () => {
        setImageSource(require('@assets/user.png'))
    }

    const loadcard = () => {
        Characters.getCard(charName).then((data) => {
            if (data) setCharacterCard(JSON.parse(data))
        })
    }

    const autosave = () => {
        if (!characterCard || charName === 'Welcome') return
        Logger.log(`Autosaved Card ${charName}`)
        savecard()
    }

    const savecard = async () => {
        return Characters.saveCard(charName, JSON.stringify(characterCard)).then(() => {
            setCurrentCard(characterCard)
        })
    }

    useEffect(() => {
        loadcard()
    }, [])

    useAutosave({
        data: characterCard,
        onSave: autosave,
        interval: 3000,
    })

    const deleteCard = () => {
        Alert.alert(
            `Delete Character`,
            `Are you sure you want to delete this character? This cannot be undone.`,
            [
                { text: 'Cancel', onPress: () => {}, style: 'cancel' },
                {
                    text: 'Confirm',
                    onPress: () => {
                        RecentMessages.deleteByCharacter(charName ?? '')
                        Characters.deleteCard(charName)
                        setCharName('Welcome')
                        router.back()
                    },
                    style: 'destructive',
                },
            ],
            { cancelable: true }
        )
    }

    const handleImportImage = () => {
        DocumentPicker.getDocumentAsync({
            copyToCacheDirectory: true,
            type: 'image/*',
        }).then((result: DocumentPicker.DocumentPickerResult) => {
            if (result.canceled) return
            Characters.copyImage(result.assets[0].uri, charName ?? '')
        })
    }

    return (
        <AnimatedView dy={200} tduration={500} fade={0} fduration={500} style={{ flex: 1 }}>
            <SafeAreaView style={styles.mainContainer}>
                <Stack.Screen
                    options={{
                        headerRight: () => (
                            <View style={styles.buttonContainer}>
                                <TouchableOpacity
                                    style={styles.button}
                                    onPress={() => {
                                        savecard().then(() => loadcard())
                                        Logger.log(`Character saved!`, true)
                                    }}>
                                    <FontAwesome
                                        name="save"
                                        size={28}
                                        color={Style.getColor('primary-text1')}
                                    />
                                </TouchableOpacity>

                                <TouchableOpacity style={styles.button} onPress={deleteCard}>
                                    <FontAwesome
                                        name="trash"
                                        size={28}
                                        color={Style.getColor('primary-text1')}
                                    />
                                </TouchableOpacity>
                            </View>
                        ),
                    }}
                />
                {characterCard && (
                    <ScrollView>
                        <View style={styles.characterHeader}>
                            <Image
                                source={imageSource}
                                style={styles.avatar}
                                onError={handleImageError}
                            />

                            <View style={styles.characterHeaderInfo}>
                                <Text
                                    style={{
                                        fontSize: 20,
                                        color: Style.getColor('primary-text1'),
                                    }}>
                                    {charName}
                                </Text>
                                <View style={styles.buttonContainer}>
                                    <TouchableOpacity
                                        style={styles.foregroundButton}
                                        onPress={handleImportImage}>
                                        <FontAwesome
                                            name="upload"
                                            size={20}
                                            color={Style.getColor('primary-text1')}
                                        />
                                    </TouchableOpacity>
                                </View>
                            </View>
                        </View>

                        <Text style={styles.boxText}>
                            Description Tokens:{' '}
                            {characterCard?.data?.description !== undefined &&
                                LlamaTokenizer.encode(characterCard.data.description).length}
                        </Text>

                        <ScrollView style={styles.inputContainer}>
                            <TextInput
                                style={styles.input}
                                multiline
                                onChangeText={(mes) => {
                                    setCharacterCard({
                                        ...characterCard,
                                        data: { ...characterCard.data, description: mes },
                                    })
                                }}
                                value={characterCard?.data?.description}
                                numberOfLines={8}
                            />
                        </ScrollView>

                        <Text style={styles.boxText}>First Message</Text>
                        <ScrollView style={styles.inputContainer}>
                            <TextInput
                                style={styles.input}
                                multiline
                                onChangeText={(mes) => {
                                    setCharacterCard({
                                        ...characterCard,
                                        data: { ...characterCard.data, first_mes: mes },
                                    })
                                }}
                                value={characterCard?.data?.first_mes}
                                numberOfLines={8}
                            />
                        </ScrollView>
                    </ScrollView>
                )}
            </SafeAreaView>
        </AnimatedView>
    )
}

const styles = StyleSheet.create({
    mainContainer: {
        flex: 1,
        paddingHorizontal: 16,
        paddingVertical: 16,
    },

    button: {
        marginRight: 20,
    },

    characterHeader: {
        alignContent: 'flex-start',
        padding: 16,
        borderRadius: 16,
        flexDirection: 'row',
        alignItems: 'center',
    },

    characterHeaderInfo: {
        marginLeft: 12,
    },

    buttonContainer: {
        justifyContent: 'flex-start',
        flexDirection: 'row',
        marginTop: 4,
    },

    foregroundButton: {
        backgroundColor: Style.getColor('primary-surface1'),
        padding: 8,
        borderRadius: 4,
    },

    avatar: {
        width: 80,
        height: 80,
        borderRadius: 20,
        borderColor: Style.getColor('primary-brand'),
        borderWidth: 2,
    },

    inputContainer: {
        backgroundColor: Style.getColor('primary-surface1'),
        borderColor: Style.getColor('primary-brand'),
        borderRadius: 8,
        borderWidth: 1,
        paddingHorizontal: 8,
        maxHeight: 160,
    },

    boxText: {
        color: Style.getColor('primary-text2'),
        paddingTop: 16,
        paddingBottom: 8,
    },

    input: {
        color: Style.getColor('primary-text1'),
        textAlignVertical: 'top',
        paddingVertical: 8,
    },
})

export default CharInfo
