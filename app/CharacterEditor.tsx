import { Alert } from '@components/Alert'
import Avatar from '@components/Avatar'
import AvatarViewer from '@components/ChatMenu/ChatWindow/AvatarViewer'
import FadeDownView from '@components/FadeDownView'
import PopupMenu from '@components/PopupMenu'
import useAutosave from '@constants/AutoSave'
import { useViewerState } from '@constants/AvatarViewer'
import { AntDesign, FontAwesome } from '@expo/vector-icons'
import { Characters, Chats, Logger, Style } from '@globals'
import { CharacterCardV2 } from 'app/constants/Characters'
import { Tokenizer } from 'app/constants/Tokenizer'
import * as DocumentPicker from 'expo-document-picker'
import { Stack, useRouter } from 'expo-router'
import { useEffect, useRef, useState } from 'react'
import {
    View,
    Text,
    SafeAreaView,
    StyleSheet,
    Image,
    TouchableOpacity,
    ScrollView,
    TextInput,
    BackHandler,
} from 'react-native'
import { useShallow } from 'zustand/react/shallow'

const ChracterEditor = () => {
    const router = useRouter()
    const { currentCard, setCurrentCard, charId, charName, unloadCharacter } =
        Characters.useCharacterCard(
            useShallow((state) => ({
                charId: state.id,
                currentCard: state.card,
                setCurrentCard: state.setCard,
                charName: state.card?.data.name,
                unloadCharacter: state.unloadCard,
            }))
        )

    const getTokenCount = Tokenizer.useTokenizer((state) => state.getTokenCount)
    const [characterCard, setCharacterCard] = useState<CharacterCardV2 | undefined>(currentCard)

    const { chat, unloadChat } = Chats.useChat((state) => ({
        chat: state.data,
        unloadChat: state.reset,
    }))

    const setShowViewer = useViewerState((state) => state.setShow)

    useEffect(() => {
        const backAction = () => {
            if (!chat) unloadCharacter()
            return false
        }
        const handler = BackHandler.addEventListener('hardwareBackPress', backAction)
        return () => handler.remove()
    }, [])

    const [edited, setEdited] = useState(false)

    const initialRender = useRef(true)

    useEffect(() => {
        if (initialRender.current) {
            initialRender.current = false
        } else setEdited(true)
    }, [characterCard])

    const savecard = async () => {
        if (characterCard && charId)
            return Characters.db.mutate.updateCard(characterCard, charId).then(() => {
                setCurrentCard(charId)
            })
    }

    const deleteCard = () => {
        Alert.alert({
            title: `Delete Character`,
            description: `Are you sure you want to delete '${charName}'? This cannot be undone.`,
            buttons: [
                { label: 'Cancel' },
                {
                    label: 'Delete Character',
                    onPress: () => {
                        Characters.db.mutate.deleteCard(charId ?? -1)
                        unloadCharacter()
                        unloadChat()
                        router.back()
                    },
                    type: 'warning',
                },
            ],
        })
    }

    const handleDeleteImage = () => {
        Alert.alert({
            title: `Delete Image`,
            description: `Are you sure you want to delete this image? This cannot be undone.`,
            buttons: [
                { label: 'Cancel' },
                {
                    label: 'Delete Image',
                    onPress: () => {
                        if (characterCard) Characters.deleteImage(characterCard.data.image_id)
                    },
                    type: 'warning',
                },
            ],
        })
    }

    const handleImportImage = () => {
        DocumentPicker.getDocumentAsync({
            copyToCacheDirectory: true,
            type: 'image/*',
        }).then((result: DocumentPicker.DocumentPickerResult) => {
            if (result.canceled || !charId) return
            Characters.useCharacterCard.getState().updateImage(result.assets[0].uri)
        })
    }

    return (
        <FadeDownView style={styles.mainContainer}>
            <Stack.Screen
                options={{
                    title: 'Edit Character',
                }}
            />
            <AvatarViewer editorButton={false} />
            {characterCard && (
                <ScrollView showsVerticalScrollIndicator={false}>
                    <View style={styles.characterHeader}>
                        <PopupMenu
                            placement="right"
                            options={[
                                {
                                    label: 'Change Image',
                                    icon: 'picture',
                                    onPress: (menu) => {
                                        menu.current?.close()
                                        handleImportImage()
                                    },
                                },
                                {
                                    label: 'View Image',
                                    icon: 'search1',
                                    onPress: (menu) => {
                                        menu.current?.close()
                                        setShowViewer(true)
                                    },
                                },
                                {
                                    label: 'Delete Image',
                                    icon: 'delete',
                                    onPress: (menu) => {
                                        menu.current?.close()
                                        handleDeleteImage()
                                    },
                                    warning: true,
                                },
                            ]}>
                            <Avatar
                                targetImage={Characters.getImageDir(
                                    currentCard?.data.image_id ?? -1
                                )}
                                style={styles.avatar}
                            />
                            <AntDesign
                                name="edit"
                                color={Style.getColor('primary-text1')}
                                style={styles.editHover}
                            />
                        </PopupMenu>

                        <View style={styles.characterHeaderInfo}>
                            <View style={styles.buttonContainer}>
                                <TouchableOpacity
                                    style={styles.buttonDestructive}
                                    onPress={deleteCard}>
                                    <AntDesign
                                        name="delete"
                                        size={20}
                                        color={Style.getColor('primary-text1')}
                                    />
                                    <Text style={styles.buttonText}>Delete Character</Text>
                                </TouchableOpacity>
                                {edited && (
                                    <TouchableOpacity
                                        style={styles.foregroundButton}
                                        onPress={savecard}>
                                        <AntDesign
                                            name="save"
                                            size={20}
                                            color={Style.getColor('primary-text1')}
                                        />
                                        <Text style={styles.buttonText}>Save</Text>
                                    </TouchableOpacity>
                                )}
                            </View>
                            <TextInput
                                style={styles.input}
                                onChangeText={(mes) => {
                                    setCharacterCard({
                                        ...characterCard,
                                        data: { ...characterCard.data, name: mes },
                                    })
                                }}
                                value={characterCard?.data?.name}
                            />
                        </View>
                    </View>

                    <Text style={styles.boxText}>
                        Description Tokens: {getTokenCount(characterCard?.data?.description ?? '')}
                    </Text>

                    <TextInput
                        scrollEnabled
                        style={styles.input}
                        multiline
                        numberOfLines={8}
                        onChangeText={(mes) => {
                            setCharacterCard({
                                ...characterCard,
                                data: { ...characterCard.data, description: mes },
                            })
                        }}
                        value={characterCard?.data?.description}
                    />

                    <Text style={styles.boxText}>First Message</Text>

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

                    <Text style={styles.boxText}>Personality</Text>

                    <TextInput
                        style={styles.input}
                        multiline
                        numberOfLines={2}
                        onChangeText={(mes) => {
                            setCharacterCard({
                                ...characterCard,
                                data: { ...characterCard.data, personality: mes },
                            })
                        }}
                        value={characterCard?.data?.personality}
                    />

                    <Text style={styles.boxText}>Scenario</Text>

                    <TextInput
                        style={styles.input}
                        multiline
                        onChangeText={(mes) => {
                            setCharacterCard({
                                ...characterCard,
                                data: { ...characterCard.data, scenario: mes },
                            })
                        }}
                        value={characterCard?.data?.scenario}
                        numberOfLines={3}
                    />

                    <Text style={styles.boxText}>Example Messages</Text>

                    <TextInput
                        style={styles.input}
                        multiline
                        onChangeText={(mes) => {
                            setCharacterCard({
                                ...characterCard,
                                data: { ...characterCard.data, mes_example: mes },
                            })
                        }}
                        value={characterCard?.data?.mes_example}
                        numberOfLines={8}
                    />
                </ScrollView>
            )}
        </FadeDownView>
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
        borderRadius: 16,
        flexDirection: 'row',
        alignItems: 'center',
    },

    characterHeaderInfo: {
        marginLeft: 24,
        rowGap: 12,
        flex: 1,
    },

    buttonContainer: {
        justifyContent: 'flex-start',
        flexDirection: 'row',
        columnGap: 4,
    },

    foregroundButton: {
        flexGrow: 1,
        flexDirection: 'row',
        borderColor: Style.getColor('confirm-brand'),
        backgroundColor: Style.getColor('confirm-brand'),
        borderWidth: 1,
        padding: 8,
        borderRadius: 4,
        columnGap: 8,
    },

    buttonDestructive: {
        flexGrow: 1,
        flexDirection: 'row',
        borderColor: Style.getColor('destructive-brand'),
        backgroundColor: Style.getColor('destructive-brand'),
        borderWidth: 1,
        padding: 8,
        borderRadius: 4,
        columnGap: 8,
    },

    buttonText: {
        color: Style.getColor('primary-text1'),
    },

    avatar: {
        width: 80,
        height: 80,
        borderRadius: 20,
        borderColor: Style.getColor('primary-brand'),
        borderWidth: 2,
    },

    boxText: {
        color: Style.getColor('primary-text2'),
        paddingTop: 24,
        paddingBottom: 12,
    },

    input: {
        color: Style.getColor('primary-text1'),
        textAlignVertical: 'top',
        paddingVertical: 8,
        backgroundColor: Style.getColor('primary-surface1'),
        borderColor: Style.getColor('primary-brand'),
        borderRadius: 8,
        borderWidth: 1,
        paddingHorizontal: 8,
    },

    editHover: {
        position: 'absolute',
        left: '75%',
        top: '75%',
        padding: 8,
        borderColor: Style.getColor('primary-text3'),
        borderWidth: 1,
        backgroundColor: Style.getColor('primary-surface3'),
        borderRadius: 12,
    },
})

export default ChracterEditor
