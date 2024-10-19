import { Alert } from '@components/Alert'
import Avatar from '@components/Avatar'
import AvatarViewer from '@components/ChatMenu/ChatWindow/AvatarViewer'
import FadeDownView from '@components/FadeDownView'
import PopupMenu from '@components/PopupMenu'
import { useViewerState } from '@constants/AvatarViewer'
import { AntDesign } from '@expo/vector-icons'
import { Characters, Chats, Logger, Style } from '@globals'
import { CharacterCardData } from 'app/constants/Characters'
import { Tokenizer } from 'app/constants/Tokenizer'
import * as DocumentPicker from 'expo-document-picker'
import { Stack, useNavigation, useRouter } from 'expo-router'
import { useEffect, useRef, useState } from 'react'
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, TextInput } from 'react-native'
import { useShallow } from 'zustand/react/shallow'

const ChracterEditor = () => {
    const router = useRouter()
    const navigation = useNavigation()
    const { currentCard, setCurrentCard, charId, charName, unloadCharacter } =
        Characters.useCharacterCard(
            useShallow((state) => ({
                charId: state.id,
                currentCard: state.card,
                setCurrentCard: state.setCard,
                charName: state.card?.name,
                unloadCharacter: state.unloadCard,
            }))
        )

    const getTokenCount = Tokenizer.useTokenizer((state) => state.getTokenCount)
    const [characterCard, setCharacterCard] = useState<CharacterCardData | undefined>(currentCard)

    const { chat, unloadChat } = Chats.useChat((state) => ({
        chat: state.data,
        unloadChat: state.reset,
    }))

    const setShowViewer = useViewerState((state) => state.setShow)

    const [edited, setEdited] = useState(false)

    const [altSwipeIndex, setAltSwipeIndex] = useState(0)

    const editedBackAction = (exitCallback: () => void) => {
        Alert.alert({
            title: `Unsaved Changes`,
            description: `You have unsaved changes, leaving now will discard your progress.`,
            buttons: [
                { label: 'Cancel' },
                {
                    label: 'Save',
                    onPress: async () => {
                        await savecard()
                        exitCallback()
                    },
                },
                {
                    label: 'Discard Changes',
                    onPress: () => {
                        exitCallback()
                    },
                    type: 'warning',
                },
            ],
        })
        return true
    }

    const initialRender = useRef(true)

    useEffect(() => {
        if (edited) return
        if (initialRender.current) {
            initialRender.current = false
            const removeListener = navigation.addListener('beforeRemove', (e) => {
                if (!chat) unloadCharacter()
                navigation.dispatch(e.data.action)
            })
            return () => removeListener()
        }
        setEdited(true)

        const removeListener = navigation.addListener('beforeRemove', (e) => {
            e.preventDefault()
            editedBackAction(() => {
                if (!chat) unloadCharacter()
                navigation.dispatch(e.data.action)
            })
        })
        return () => removeListener()
    }, [characterCard])

    const savecard = async () => {
        if (characterCard && charId)
            return Characters.db.mutate.updateCard(characterCard, charId).then(() => {
                setCurrentCard(charId)
                setEdited(false)
                Logger.log('Card Saved!', true)
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
                        if (characterCard) Characters.deleteImage(characterCard.image_id)
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

    const handleAddAltMessage = async () => {
        if (!charId || !characterCard) return
        const id = await Characters.db.mutate.addAltGreeting(charId)
        await setCurrentCard(charId)

        // optimistically update editor state

        const greetings = [
            ...(characterCard?.alternate_greetings ?? []),
            { id: id, greeting: '', character_id: charId },
        ]
        setCharacterCard({ ...characterCard, alternate_greetings: greetings })
        if (characterCard.alternate_greetings.length !== 0) {
            setAltSwipeIndex(altSwipeIndex + 1)
        }
    }

    const deleteAltMessageRoutine = async () => {
        const id = characterCard?.alternate_greetings[altSwipeIndex].id
        if (!id || !charId) {
            Logger.log('Error deleting swipe', true)
            return
        }
        await Characters.db.mutate.deleteAltGreeting(id)
        await setCurrentCard(charId)
        const greetings = [...(characterCard?.alternate_greetings ?? [])].filter(
            (item) => item.id !== id
        )
        setAltSwipeIndex(0)
        setCharacterCard({ ...characterCard, alternate_greetings: greetings })
    }

    const handleDeleteAltMessage = async () => {
        Alert.alert({
            title: `Delete Alternate Message`,
            description: `Are you sure you want to delete this alternate message? This cannot be undone.`,
            buttons: [
                { label: 'Cancel' },
                {
                    label: 'Delete',
                    onPress: async () => {
                        await deleteAltMessageRoutine()
                    },
                    type: 'warning',
                },
            ],
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
                                targetImage={Characters.getImageDir(currentCard?.image_id ?? -1)}
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
                                        name: mes,
                                    })
                                }}
                                value={characterCard?.name}
                            />
                        </View>
                    </View>

                    <Text style={styles.boxText}>
                        Description Tokens: {getTokenCount(characterCard?.description ?? '')}
                    </Text>

                    <TextInput
                        scrollEnabled
                        style={styles.input}
                        multiline
                        numberOfLines={8}
                        onChangeText={(mes) => {
                            setCharacterCard({
                                ...characterCard,
                                description: mes,
                            })
                        }}
                        value={characterCard?.description}
                    />

                    <Text style={styles.boxText}>First Message</Text>

                    <TextInput
                        style={styles.input}
                        multiline
                        onChangeText={(mes) => {
                            setCharacterCard({
                                ...characterCard,
                                first_mes: mes,
                            })
                        }}
                        value={characterCard?.first_mes}
                        numberOfLines={8}
                    />

                    <View
                        style={{
                            flexDirection: 'row',
                            justifyContent: 'space-between',
                            marginTop: 24,
                            marginBottom: 12,
                        }}>
                        <Text style={{ color: Style.getColor('primary-text2') }}>
                            Alternate Greetings{'  '}
                            {characterCard.alternate_greetings.length !== 0 && (
                                <Text
                                    style={{
                                        color: Style.getColor('primary-text2'),
                                    }}>
                                    {altSwipeIndex + 1} / {characterCard.alternate_greetings.length}
                                </Text>
                            )}
                        </Text>

                        <View style={{ flexDirection: 'row', columnGap: 32 }}>
                            <TouchableOpacity onPress={handleDeleteAltMessage}>
                                {characterCard.alternate_greetings.length !== 0 && (
                                    <AntDesign
                                        color={Style.getColor('destructive-brand')}
                                        name="delete"
                                        size={20}
                                    />
                                )}
                            </TouchableOpacity>
                            <TouchableOpacity
                                onPress={() => setAltSwipeIndex(Math.max(altSwipeIndex - 1, 0))}>
                                <AntDesign
                                    color={Style.getColor(
                                        altSwipeIndex === 0 ? 'primary-text3' : 'primary-text1'
                                    )}
                                    name="left"
                                    size={20}
                                />
                            </TouchableOpacity>
                            {altSwipeIndex === characterCard.alternate_greetings.length - 1 ||
                            characterCard.alternate_greetings.length === 0 ? (
                                <TouchableOpacity onPress={handleAddAltMessage}>
                                    <AntDesign
                                        color={Style.getColor('primary-text1')}
                                        name="plus"
                                        size={20}
                                    />
                                </TouchableOpacity>
                            ) : (
                                <TouchableOpacity
                                    onPress={() =>
                                        setAltSwipeIndex(
                                            Math.min(
                                                altSwipeIndex + 1,
                                                characterCard.alternate_greetings.length - 1
                                            )
                                        )
                                    }>
                                    <AntDesign
                                        color={Style.getColor('primary-text1')}
                                        name="right"
                                        size={20}
                                    />
                                </TouchableOpacity>
                            )}
                        </View>
                    </View>

                    {characterCard.alternate_greetings.length !== 0 ? (
                        <TextInput
                            style={styles.input}
                            multiline
                            numberOfLines={2}
                            onChangeText={(mes) => {
                                const greetings = [...characterCard.alternate_greetings]
                                greetings[altSwipeIndex].greeting = mes
                                setCharacterCard({
                                    ...characterCard,
                                    alternate_greetings: greetings,
                                })
                            }}
                            value={
                                characterCard?.alternate_greetings?.[altSwipeIndex].greeting ?? ''
                            }
                        />
                    ) : (
                        <Text
                            style={{
                                ...styles.input,
                                color: Style.getColor('primary-text2'),
                                fontStyle: 'italic',
                            }}>
                            No Alernate Greetings
                        </Text>
                    )}

                    <Text style={styles.boxText}>Personality</Text>

                    <TextInput
                        style={styles.input}
                        multiline
                        numberOfLines={2}
                        onChangeText={(mes) => {
                            setCharacterCard({
                                ...characterCard,
                                personality: mes,
                            })
                        }}
                        value={characterCard?.personality}
                    />

                    <Text style={styles.boxText}>Scenario</Text>

                    <TextInput
                        style={styles.input}
                        multiline
                        onChangeText={(mes) => {
                            setCharacterCard({
                                ...characterCard,
                                scenario: mes,
                            })
                        }}
                        value={characterCard?.scenario}
                        numberOfLines={3}
                    />

                    <Text style={styles.boxText}>Example Messages</Text>

                    <TextInput
                        style={styles.input}
                        multiline
                        onChangeText={(mes) => {
                            setCharacterCard({
                                ...characterCard,
                                mes_example: mes,
                            })
                        }}
                        value={characterCard?.mes_example}
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
