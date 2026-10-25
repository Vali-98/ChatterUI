import AntDesign from '@react-native-vector-icons/ant-design/static'
import { count, eq } from 'drizzle-orm'
import * as DocumentPicker from 'expo-document-picker'
import { ImageBackground } from 'expo-image'
import { Redirect, useNavigation, useRouter } from 'expo-router'
import { usePreventRemove } from 'expo-router/build/react-navigation'
import { useEffect, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native'
import { KeyboardAwareScrollView } from 'react-native-keyboard-controller'
import { SafeAreaView } from 'react-native-safe-area-context'
import { useShallow } from 'zustand/react/shallow'

import ThemedButton from '@components/buttons/ThemedButton'
import StringArrayEditor from '@components/input/StringArrayEditor'
import ThemedTextInput from '@components/input/ThemedTextInput'
import Alert from '@components/views/Alert'
import Avatar from '@components/views/Avatar'
import AvatarViewer from '@components/views/AvatarViewer'
import ContextMenu from '@components/views/ContextMenu'
import HeaderButton from '@components/views/HeaderButton'
import HeaderTitle from '@components/views/HeaderTitle'
import { db } from '@db/db'
import { characterTags, tags } from '@db/schema'
import { useLiveQueryAsync } from '@lib/hooks/liveQuery'
import { useDebounceTokenizer } from '@lib/hooks/Tokenizer'
import { CharacterCardData, Characters } from '@lib/state/characters'
import { Chats } from '@lib/state/Chat'
import { useAvatarViewerStore } from '@lib/state/components/AvatarViewer'
import { Logger } from '@lib/state/Logger'
import { Theme } from '@lib/theme/ThemeManager'

const ChracterEditorScreen = () => {
    const { t } = useTranslation()
    const styles = useStyles()
    const { color, spacing } = Theme.useTheme()
    const navigation = useNavigation()
    const router = useRouter()
    const { data } = useLiveQueryAsync(
        db
            .select({
                tag: tags.tag,
                id: tags.id,
                tagCount: count(characterTags.tag_id),
            })
            .from(tags)
            .leftJoin(characterTags, eq(characterTags.tag_id, tags.id))
            .groupBy(tags.id),
        { key: ['tag-counts'], watch: [{ table: 'tags' }, { table: 'character_tags' }] }
    )
    const { currentCard, charId, charName, unloadCharacter } = Characters.useCharacterStore(
        useShallow((state) => ({
            charId: state.id,
            currentCard: state.card,
            charName: state.card?.name,
            unloadCharacter: state.unloadCard,
        }))
    )

    const [characterCard, setCharacterCard] = useState<CharacterCardData | undefined>(currentCard)
    const descriptionTokens = useDebounceTokenizer(characterCard?.description ?? '', 300)
    const { chatId, resetId } = Chats.useChat()
    const backgroundImage = currentCard?.background_image
    const setShowViewer = useAvatarViewerStore((state) => state.setShow)
    const [edited, setEdited] = useState(false)
    const [altSwipeIndex, setAltSwipeIndex] = useState(0)

    const previousSavedCard = useRef(currentCard)
    useEffect(() => {
        // A dirty-flag change alone must not reset the draft before DB notifications arrive.
        if (previousSavedCard.current === currentCard) return
        previousSavedCard.current = currentCard
        setCharacterCard((current) =>
            edited && current?.id === currentCard?.id ? current : currentCard
        )
    }, [currentCard, edited])

    const setCharacterCardEdited = (card: CharacterCardData) => {
        if (!edited) setEdited(true)
        setCharacterCard(card)
    }

    const handleSaveCard = async () => {
        if (!characterCard || !charId) return
        const saved = await Characters.db.mutate.updateCard(characterCard, charId)
        if (!saved || Characters.useCharacterStore.getState().id !== charId) return
        setCharacterCard(saved)
        setEdited(false)
        Logger.infoToast(t('character.editor.messages.saved'))
    }

    usePreventRemove(edited, ({ data }) => {
        if (!charId) return
        Alert.alert({
            title: t('character.editor.dialogs.unsavedChanges.title'),
            description: t('character.editor.dialogs.unsavedChanges.description'),
            buttons: [
                { label: t('common.actions.cancel') },
                {
                    label: t('common.actions.save'),
                    onPress: async () => {
                        await handleSaveCard()
                        navigation.dispatch(data.action)
                    },
                },
                {
                    label: t('character.editor.dialogs.unsavedChanges.discard'),
                    onPress: () => {
                        navigation.dispatch(data.action)
                    },
                    type: 'warning',
                },
            ],
        })
    })

    const handleExportCard = () => {
        try {
            if (!charId) return
            Characters.actions
                .exportCharacter(charId)
                .catch((e) => {
                    Logger.errorToast(t('character.editor.errors.exportFailed'))
                    Logger.error(e)
                })
                .then(() => {
                    Logger.infoToast(t('character.editor.messages.exported'))
                })
        } catch (e) {
            Logger.errorToast(t('character.editor.errors.export'), e)
        }
    }

    const handleDeleteCard = () => {
        Alert.alert({
            title: t('character.editor.dialogs.deleteCharacter.title'),
            description: t('character.editor.dialogs.deleteCharacter.description', {
                name: charName,
            }),
            buttons: [
                { label: t('common.actions.cancel') },
                {
                    label: t('character.editor.dialogs.deleteCharacter.confirm'),
                    onPress: async () => {
                        await Characters.actions.deleteCard(charId ?? -1)
                        unloadCharacter()
                        resetId()
                        setEdited(false)
                        Logger.info(t('character.editor.messages.deleted', { name: charName }))
                    },
                    type: 'warning',
                },
            ],
        })
    }

    useEffect(() => {
        return () => {
            if (!chatId) unloadCharacter()
        }
    }, [chatId, unloadCharacter])

    const handleDeleteImage = () => {
        Alert.alert({
            title: t('character.editor.dialogs.deleteImage.title'),
            description: t('character.editor.dialogs.deleteImage.description'),
            buttons: [
                { label: t('common.actions.cancel') },
                {
                    label: t('character.editor.dialogs.deleteImage.confirm'),
                    onPress: async () => {
                        if (currentCard) {
                            try {
                                await Characters.actions.deleteImage(currentCard.id)
                            } catch (error) {
                                Logger.errorToast(t('common.errors.couldNotGetData'), error)
                            }
                        }
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
        })
            .then(async (result: DocumentPicker.DocumentPickerResult) => {
                if (result.canceled || !charId) return
                await Characters.actions.updateImage(charId, result.assets[0].uri)
            })
            .catch((error) => Logger.errorToast(t('common.errors.couldNotGetData'), error))
    }

    const handleAddAltMessage = async () => {
        if (!charId || !characterCard) return
        const id = await Characters.db.mutate.addAltGreeting(charId)

        // optimistically update editor state

        const greetings = [
            ...(characterCard?.alternate_greetings ?? []),
            { id: id, greeting: '', character_id: charId },
        ]
        setCharacterCardEdited({ ...characterCard, alternate_greetings: greetings })
        if (characterCard.alternate_greetings.length !== 0) {
            setAltSwipeIndex(altSwipeIndex + 1)
        }
    }

    const deleteAltMessageRoutine = async () => {
        const id = characterCard?.alternate_greetings[altSwipeIndex].id
        if (!id || !charId) {
            return
        }
        await Characters.db.mutate.deleteAltGreeting(id)
        const greetings = [...(characterCard?.alternate_greetings ?? [])].filter(
            (item) => item.id !== id
        )
        setAltSwipeIndex(0)
        setCharacterCardEdited({ ...characterCard, alternate_greetings: greetings })
    }

    const handleDeleteAltMessage = async () => {
        Alert.alert({
            title: t('character.editor.dialogs.deleteAlternateMessage.title'),
            description: t('character.editor.dialogs.deleteAlternateMessage.description'),
            buttons: [
                { label: t('common.actions.cancel') },
                {
                    label: t('character.editor.dialogs.deleteAlternateMessage.confirm'),
                    onPress: async () => {
                        await deleteAltMessageRoutine()
                    },
                    type: 'warning',
                },
            ],
        })
    }

    const headerRight = () => (
        <ContextMenu placement="bottom">
            <ContextMenu.Trigger icon="setting" />
            <ContextMenu.Body>
                <ContextMenu.Button
                    label={t('common.actions.export')}
                    icon="upload"
                    onPress={() => {
                        handleExportCard()
                    }}
                />
                <ContextMenu.Button
                    label={t('character.editor.actions.manageLinks')}
                    icon="link"
                    onPress={() => {
                        router.push('/screens/CharacterLinksScreen')
                    }}
                />
                <ContextMenu.Button
                    label={t('common.actions.delete')}
                    icon="delete"
                    onPress={() => {
                        handleDeleteCard()
                    }}
                    variant="warning"
                />
            </ContextMenu.Body>
        </ContextMenu>
    )

    if (!charId) return <Redirect href=".." />
    return (
        <SafeAreaView style={{ flex: 1 }} edges={['bottom']}>
            <HeaderButton headerRight={headerRight} />
            <ImageBackground
                cachePolicy="none"
                style={styles.mainContainer}
                source={{
                    uri: backgroundImage ? Characters.getImageDir(backgroundImage) : '',
                }}>
                <HeaderTitle title={t('character.editor.title')} />
                <AvatarViewer editorButton={false} />

                {characterCard && (
                    <KeyboardAwareScrollView
                        bottomOffset={16}
                        showsVerticalScrollIndicator={false}
                        keyboardShouldPersistTaps="always"
                        contentContainerStyle={{ rowGap: 8, paddingBottom: 24 }}>
                        <View style={styles.characterHeader}>
                            <ContextMenu placement="right">
                                <ContextMenu.Trigger>
                                    <Avatar
                                        targetImage={Characters.getImageDir(
                                            currentCard?.image_id ?? -1
                                        )}
                                        style={styles.avatar}
                                    />
                                    <AntDesign
                                        name="edit"
                                        color={color.text._100}
                                        style={styles.editHover}
                                    />
                                </ContextMenu.Trigger>
                                <ContextMenu.Body>
                                    <ContextMenu.Button
                                        label={t('character.editor.actions.changeImage')}
                                        icon="picture"
                                        closeOnPress={false}
                                        onPress={(close) => {
                                            close()
                                            handleImportImage()
                                        }}
                                    />
                                    <ContextMenu.Button
                                        label={t('character.editor.actions.changeBackground')}
                                        icon="picture"
                                        closeOnPress={false}
                                        onPress={async (close) => {
                                            close()
                                            await Characters.actions.importBackground(charId)
                                        }}
                                    />
                                    <ContextMenu.Button
                                        label={t('character.editor.actions.viewImage')}
                                        icon="search"
                                        closeOnPress={false}
                                        onPress={(close) => {
                                            close()
                                            setShowViewer(true)
                                        }}
                                    />
                                    <ContextMenu.Button
                                        label={t('character.editor.dialogs.deleteImage.confirm')}
                                        icon="delete"
                                        closeOnPress={false}
                                        onPress={(close) => {
                                            close()
                                            handleDeleteImage()
                                        }}
                                        variant="warning"
                                    />
                                    <ContextMenu.Button
                                        hidden={!backgroundImage}
                                        label={t('character.editor.actions.removeBackground')}
                                        icon="delete"
                                        closeOnPress={false}
                                        onPress={(close) => {
                                            close()
                                            if (backgroundImage)
                                                Characters.actions.deleteBackground(charId)
                                        }}
                                        variant="warning"
                                    />
                                </ContextMenu.Body>
                            </ContextMenu>

                            <View style={styles.characterHeaderInfo}>
                                <View style={styles.buttonContainer}>
                                    <ThemedButton
                                        disabled={!edited}
                                        iconName="save"
                                        iconSize={20}
                                        label={t('common.actions.save')}
                                        onPress={handleSaveCard}
                                        variant={edited ? 'secondary' : 'disabled'}
                                    />
                                </View>
                                <ThemedTextInput
                                    onChangeText={(mes) => {
                                        setCharacterCardEdited({
                                            ...characterCard,
                                            name: mes,
                                        })
                                    }}
                                    value={characterCard?.name}
                                />
                            </View>
                        </View>

                        <ThemedTextInput
                            scrollEnabled
                            label={t('character.editor.metrics.descriptionTokens', {
                                count: descriptionTokens,
                            })}
                            multiline
                            containerStyle={styles.input}
                            numberOfLines={16}
                            onChangeText={(mes) => {
                                setCharacterCardEdited({
                                    ...characterCard,
                                    description: mes,
                                })
                            }}
                            value={characterCard?.description}
                        />

                        <ThemedTextInput
                            label={t('character.editor.fields.firstMessage')}
                            multiline
                            containerStyle={styles.input}
                            onChangeText={(mes) => {
                                setCharacterCardEdited({
                                    ...characterCard,
                                    first_mes: mes,
                                })
                            }}
                            value={characterCard?.first_mes}
                            numberOfLines={16}
                        />
                        <View style={styles.input}>
                            <View
                                style={{
                                    flexDirection: 'row',
                                    justifyContent: 'space-between',
                                    paddingBottom: 12,
                                }}>
                                <Text style={{ color: color.text._100 }}>
                                    {t('character.editor.fields.alternateGreeting')}
                                    {'   '}
                                    {characterCard.alternate_greetings.length !== 0 && (
                                        <Text
                                            style={{
                                                color: color.text._100,
                                            }}>
                                            {altSwipeIndex + 1} /{' '}
                                            {characterCard.alternate_greetings.length}
                                        </Text>
                                    )}
                                </Text>

                                <View style={{ flexDirection: 'row', columnGap: 32 }}>
                                    <TouchableOpacity onPress={handleDeleteAltMessage}>
                                        {characterCard.alternate_greetings.length !== 0 && (
                                            <AntDesign
                                                color={color.error._400}
                                                name="delete"
                                                size={20}
                                            />
                                        )}
                                    </TouchableOpacity>
                                    {characterCard.alternate_greetings.length > 0 && (
                                        <TouchableOpacity
                                            onPress={() =>
                                                setAltSwipeIndex(Math.max(altSwipeIndex - 1, 0))
                                            }>
                                            <AntDesign
                                                color={
                                                    altSwipeIndex === 0
                                                        ? color.text._700
                                                        : color.text._100
                                                }
                                                name="left"
                                                size={20}
                                            />
                                        </TouchableOpacity>
                                    )}
                                    {altSwipeIndex ===
                                        characterCard.alternate_greetings.length - 1 ||
                                    characterCard.alternate_greetings.length === 0 ? (
                                        <TouchableOpacity onPress={handleAddAltMessage}>
                                            <AntDesign
                                                color={color.text._100}
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
                                                color={color.text._100}
                                                name="right"
                                                size={20}
                                            />
                                        </TouchableOpacity>
                                    )}
                                </View>
                            </View>

                            {characterCard.alternate_greetings.length !== 0 ? (
                                <ThemedTextInput
                                    multiline
                                    numberOfLines={16}
                                    onChangeText={(mes) => {
                                        const greetings = [...characterCard.alternate_greetings]
                                        greetings[altSwipeIndex].greeting = mes
                                        setCharacterCardEdited({
                                            ...characterCard,
                                            alternate_greetings: greetings,
                                        })
                                    }}
                                    value={
                                        characterCard?.alternate_greetings?.[altSwipeIndex]
                                            .greeting ?? ''
                                    }
                                />
                            ) : (
                                <Text
                                    style={{
                                        borderColor: color.neutral._400,
                                        borderWidth: 1,
                                        borderRadius: 8,
                                        padding: spacing.m,
                                        color: color.text._500,
                                        fontStyle: 'italic',
                                    }}>
                                    {t('character.editor.emptyStates.noAlternateGreetings')}
                                </Text>
                            )}
                        </View>

                        <ThemedTextInput
                            label={t('character.editor.fields.personality')}
                            multiline
                            containerStyle={styles.input}
                            numberOfLines={4}
                            onChangeText={(mes) => {
                                setCharacterCardEdited({
                                    ...characterCard,
                                    personality: mes,
                                })
                            }}
                            value={characterCard?.personality}
                        />

                        <ThemedTextInput
                            label={t('character.editor.fields.scenario')}
                            multiline
                            containerStyle={styles.input}
                            onChangeText={(mes) => {
                                setCharacterCardEdited({
                                    ...characterCard,
                                    scenario: mes,
                                })
                            }}
                            value={characterCard?.scenario}
                            numberOfLines={4}
                        />

                        <ThemedTextInput
                            label={t('character.editor.fields.exampleMessages')}
                            multiline
                            containerStyle={styles.input}
                            onChangeText={(mes) => {
                                setCharacterCardEdited({
                                    ...characterCard,
                                    mes_example: mes,
                                })
                            }}
                            value={characterCard?.mes_example}
                            numberOfLines={16}
                        />

                        <StringArrayEditor
                            label={t('character.editor.fields.tags')}
                            containerStyle={styles.input}
                            suggestions={data
                                .map((item) => item.tag)
                                .filter(
                                    (a) => !characterCard?.tags.some((item) => item.tag.tag === a)
                                )}
                            showSuggestionsOnEmpty
                            value={characterCard?.tags.map((item) => item.tag.tag) ?? []}
                            setValue={(value) => {
                                const newTags = value
                                    .filter((v) => !characterCard.tags.some((a) => a.tag.tag === v))
                                    .map((a) => {
                                        const existing = data.filter((item) => item.tag === a)?.[0]
                                        if (existing) {
                                            return { tag_id: existing.id, tag: existing }
                                        }
                                        return { tag_id: -1, tag: { tag: a, id: -1 } }
                                    })
                                setCharacterCardEdited({
                                    ...characterCard,
                                    tags: [
                                        ...characterCard.tags.filter((v) =>
                                            value.some((a) => a === v.tag.tag)
                                        ),
                                        ...newTags,
                                    ],
                                })
                            }}
                        />
                    </KeyboardAwareScrollView>
                )}
            </ImageBackground>
        </SafeAreaView>
    )
}

const useStyles = () => {
    const { color, spacing, borderRadius } = Theme.useTheme()
    return StyleSheet.create({
        mainContainer: {
            flex: 1,
            paddingHorizontal: spacing.m,
            paddingTop: spacing.m,
            paddingBottom: spacing.s,
        },

        characterHeader: {
            alignContent: 'flex-start',
            borderRadius: borderRadius.xl,
            flexDirection: 'row',
            alignItems: 'center',
            backgroundColor: color.neutral._100,
            paddingVertical: 12,
            paddingHorizontal: 12,
        },

        characterHeaderInfo: {
            marginLeft: spacing.xl2,
            rowGap: 12,
            flex: 1,
        },

        input: {
            backgroundColor: color.neutral._100,
            paddingVertical: 12,
            paddingHorizontal: 12,
            borderRadius: 8,
        },

        buttonContainer: {
            justifyContent: 'flex-start',
            flexDirection: 'row',
            columnGap: 4,
        },

        avatar: {
            width: 80,
            height: 80,
            borderRadius: borderRadius.xl2,
            borderColor: color.primary._500,
            borderWidth: 2,
        },

        editHover: {
            position: 'absolute',
            left: '75%',
            top: '75%',
            padding: spacing.m,
            borderColor: color.text._700,
            borderWidth: 1,
            backgroundColor: color.primary._300,
            borderRadius: borderRadius.l,
        },
    })
}

export default ChracterEditorScreen
