import { AntDesign, MaterialCommunityIcons } from '@expo/vector-icons'
import { usePreventRemove } from '@react-navigation/core'
import { count, eq } from 'drizzle-orm'
import { useLiveQuery } from 'drizzle-orm/expo-sqlite'
import * as DocumentPicker from 'expo-document-picker'
import { ImageBackground } from 'expo-image'
import { Redirect, useNavigation } from 'expo-router'
import { useEffect, useState } from 'react'
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
import HeaderTitle from '@components/views/HeaderTitle'
import { db } from '@db'
import { useDebounceTokenizer } from '@lib/hooks/Tokenizer'
import { CharacterCardData, Characters } from '@lib/state/Characters'
import { Chats } from '@lib/state/Chat'
import { useAvatarViewerStore } from '@lib/state/components/AvatarViewer'
import { importLive2DModel, deleteLive2DModel } from '@lib/state/Live2D'
import { Logger } from '@lib/state/Logger'
import { Theme } from '@lib/theme/ThemeManager'
import { characterTags, tags } from 'db/schema'

const ChracterEditorScreen = () => {
    const styles = useStyles()
    const { color, spacing } = Theme.useTheme()
    const navigation = useNavigation()
    const data = useLiveQuery(
        db
            .select({
                tag: tags.tag,
                id: tags.id,
                tagCount: count(characterTags.tag_id),
            })
            .from(tags)
            .leftJoin(characterTags, eq(characterTags.tag_id, tags.id))
            .groupBy(tags.id)
    )
    const { currentCard, setCurrentCard, charId, charName, unloadCharacter } =
        Characters.useCharacterStore(
            useShallow((state) => ({
                charId: state.id,
                currentCard: state.card,
                setCurrentCard: state.setCard,
                charName: state.card?.name,
                unloadCharacter: state.unloadCard,
            }))
        )

    const [characterCard, setCharacterCard] = useState<CharacterCardData | undefined>(currentCard)
    const descriptionTokens = useDebounceTokenizer(characterCard?.description ?? '', 300)
    const { chat, unloadChat } = Chats.useChat()

    // ── Background image (existing) ──────────────────────────────────────────
    const { data: { background_image: backgroundImage } = {} } = useLiveQuery(
        Characters.db.query.backgroundImageQuery(charId ?? -1)
    )

    // ── Live2D model path ────────────────────────────────────────────────────
    const { data: live2dRow } = useLiveQuery(
        db.query.characters.findFirst({
            where: eq(db._.$inferSelect.characters.id, charId ?? -1) as any,
            columns: { live2d_model_path: true },
        })
    )
    const live2dModelPath: string | null = (live2dRow as any)?.live2d_model_path ?? null
    // Extract a display-friendly model folder name from the path
    const live2dModelName = live2dModelPath
        ? live2dModelPath.split('/').slice(-2, -1)[0] ?? 'Custom model'
        : null

    const setShowViewer = useAvatarViewerStore((state) => state.setShow)
    const [edited, setEdited] = useState(false)
    const [altSwipeIndex, setAltSwipeIndex] = useState(0)

    const setCharacterCardEdited = (card: CharacterCardData) => {
        if (!edited) setEdited(true)
        setCharacterCard(card)
    }

    usePreventRemove(edited, ({ data }) => {
        if (!charId) return
        Alert.alert({
            title: `Unsaved Changes`,
            description: `You have unsaved changes, leaving now will discard your progress.`,
            buttons: [
                { label: 'Cancel' },
                {
                    label: 'Save',
                    onPress: async () => {
                        await handleSaveCard()
                        navigation.dispatch(data.action)
                    },
                },
                {
                    label: 'Discard Changes',
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
            Characters.exportCharacter(charId)
                .catch((e) => {
                    Logger.errorToast('Failed to export')
                    Logger.error(JSON.stringify(e))
                })
                .then(() => {
                    Logger.infoToast('Card Exported!')
                })
        } catch (e) {
            Logger.errorToast('Could not export: ' + JSON.stringify(e))
        }
    }

    const handleSaveCard = async () => {
        if (characterCard && charId)
            return Characters.db.mutate.updateCard(characterCard, charId).then(() => {
                setCurrentCard(charId)
                setEdited(() => false)
                Logger.infoToast('Card Saved!')
            })
    }

    const handleDeleteCard = () => {
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
                        setEdited(false)
                        Logger.info(`Deleted character: ${charName}`)
                    },
                    type: 'warning',
                },
            ],
        })
    }

    useEffect(() => {
        return () => {
            if (!chat) unloadCharacter()
        }
    }, [chat, unloadCharacter])

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
            Characters.useCharacterStore.getState().updateImage(result.assets[0].uri)
        })
    }

    // ── Live2D handlers ──────────────────────────────────────────────────────

    const handleImportLive2D = async () => {
        if (!charId) return
        await importLive2DModel(charId)
    }

    const handleDeleteLive2D = () => {
        if (!charId) return
        Alert.alert({
            title: 'Remove Live2D Model',
            description: `Remove the Live2D model from "${charName}"? The imported files will be deleted.`,
            buttons: [
                { label: 'Cancel' },
                {
                    label: 'Remove',
                    onPress: () => deleteLive2DModel(charId),
                    type: 'warning',
                },
            ],
        })
    }

    const handleAddAltMessage = async () => {
        if (!charId || !characterCard) return
        const id = await Characters.db.mutate.addAltGreeting(charId)
        await setCurrentCard(charId)
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
            Logger.errorToast('Error deleting swipe')
            return
        }
        await Characters.db.mutate.deleteAltGreeting(id)
        await setCurrentCard(charId)
        const greetings = [...(characterCard?.alternate_greetings ?? [])].filter(
            (item) => item.id !== id
        )
        setAltSwipeIndex(0)
        setCharacterCardEdited({ ...characterCard, alternate_greetings: greetings })
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

    if (!charId) return <Redirect href=".." />
    return (
        <SafeAreaView style={{ flex: 1 }} edges={['bottom']}>
            <ImageBackground
                cachePolicy="none"
                style={styles.mainContainer}
                source={{
                    uri: backgroundImage ? Characters.getImageDir(backgroundImage) : '',
                }}>
                <HeaderTitle title="Edit Character" />
                <AvatarViewer editorButton={false} />

                {characterCard && (
                    <KeyboardAwareScrollView
                        bottomOffset={16}
                        showsVerticalScrollIndicator={false}
                        keyboardShouldPersistTaps="always"
                        contentContainerStyle={{ rowGap: 8, paddingBottom: 24 }}>

                        {/* ── Existing character header ────────────────────── */}
                        <View style={styles.characterHeader}>
                            <ContextMenu
                                placement="right"
                                buttons={[
                                    {
                                        label: 'Change Image',
                                        icon: 'picture',
                                        onPress: (close) => {
                                            close()
                                            handleImportImage()
                                        },
                                    },
                                    {
                                        label: 'Change Background',
                                        icon: 'picture',
                                        onPress: async (close) => {
                                            close()
                                            await Characters.importBackground(
                                                charId,
                                                characterCard.background_image
                                            )
                                        },
                                    },
                                    {
                                        label: 'View Image',
                                        icon: 'search',
                                        onPress: (close) => {
                                            close()
                                            setShowViewer(true)
                                        },
                                    },
                                    {
                                        label: 'Delete Image',
                                        icon: 'delete',
                                        onPress: (close) => {
                                            close()
                                            handleDeleteImage()
                                        },
                                        variant: 'warning',
                                    },
                                    {
                                        label: 'Remove Background',
                                        icon: 'delete',
                                        onPress: (close) => {
                                            close()
                                            if (backgroundImage)
                                                Characters.deleteBackground(charId, backgroundImage)
                                        },
                                        disabled: !backgroundImage,
                                        variant: 'warning',
                                    },
                                ]}>
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
                            </ContextMenu>

                            <View style={styles.characterHeaderInfo}>
                                <View style={styles.buttonContainer}>
                                    <ThemedButton
                                        iconName="delete"
                                        iconSize={20}
                                        variant="critical"
                                        label="Delete"
                                        onPress={handleDeleteCard}
                                    />
                                    {!edited && (
                                        <ThemedButton
                                            iconName="upload"
                                            iconSize={20}
                                            label="Export"
                                            onPress={handleExportCard}
                                            variant="secondary"
                                        />
                                    )}
                                    {edited && (
                                        <ThemedButton
                                            iconName="save"
                                            iconSize={20}
                                            label="Save"
                                            onPress={handleSaveCard}
                                            variant="secondary"
                                        />
                                    )}
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

                        {/* ── Live2D Model section ─────────────────────────── */}
                        <View style={styles.live2dSection}>
                            <View style={styles.live2dHeader}>
                                <MaterialCommunityIcons
                                    name="animation-play"
                                    size={18}
                                    color={color.primary._500}
                                />
                                <Text style={styles.live2dTitle}>Live2D Model</Text>
                            </View>

                            <View style={styles.live2dRow}>
                                {/* Current model name, or placeholder */}
                                <View style={styles.live2dModelInfo}>
                                    <Text
                                        style={[
                                            styles.live2dModelName,
                                            !live2dModelName && styles.live2dModelNone,
                                        ]}
                                        numberOfLines={1}
                                        ellipsizeMode="middle">
                                        {live2dModelName ?? 'No model selected'}
                                    </Text>
                                    <Text style={styles.live2dHint}>
                                        Supports .zip, .wks (Live2DViewerEX) or .model3.json
                                    </Text>
                                </View>

                                {/* Import button */}
                                <TouchableOpacity
                                    style={styles.live2dImportBtn}
                                    onPress={handleImportLive2D}
                                    activeOpacity={0.7}>
                                    <MaterialCommunityIcons
                                        name="folder-open-outline"
                                        size={20}
                                        color={color.primary._500}
                                    />
                                    <Text style={styles.live2dBtnLabel}>
                                        {live2dModelName ? 'Change' : 'Import'}
                                    </Text>
                                </TouchableOpacity>

                                {/* Remove button — only shown when a model is set */}
                                {live2dModelName && (
                                    <TouchableOpacity
                                        style={styles.live2dRemoveBtn}
                                        onPress={handleDeleteLive2D}
                                        activeOpacity={0.7}>
                                        <AntDesign
                                            name="close"
                                            size={16}
                                            color={color.error._400}
                                        />
                                    </TouchableOpacity>
                                )}
                            </View>
                        </View>
                        {/* ─────────────────────────────────────────────────── */}

                        <ThemedTextInput
                            scrollEnabled
                            label={`Description Tokens: ${descriptionTokens}`}
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
                            label="First Message"
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
                                    Alternate Greeting{'   '}
                                    {characterCard.alternate_greetings.length !== 0 && (
                                        <Text style={{ color: color.text._100 }}>
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
                                    No Alternate Greetings
                                </Text>
                            )}
                        </View>

                        <ThemedTextInput
                            label="Personality"
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
                            label="Scenario"
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
                            label="Example Messages"
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
                            label="Tags"
                            containerStyle={styles.input}
                            suggestions={data.data
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
                                        const existing = data.data.filter(
                                            (item) => item.tag === a
                                        )?.[0]
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

        // ── Live2D styles ───────────────────────────────────────────────────
        live2dSection: {
            backgroundColor: color.neutral._100,
            borderRadius: borderRadius.xl,
            paddingVertical: 12,
            paddingHorizontal: 12,
            rowGap: 8,
        },

        live2dHeader: {
            flexDirection: 'row',
            alignItems: 'center',
            columnGap: 6,
        },

        live2dTitle: {
            color: color.text._100,
            fontWeight: '600',
            fontSize: 14,
        },

        live2dRow: {
            flexDirection: 'row',
            alignItems: 'center',
            columnGap: 8,
        },

        live2dModelInfo: {
            flex: 1,
            rowGap: 2,
        },

        live2dModelName: {
            color: color.text._100,
            fontSize: 13,
            fontWeight: '500',
        },

        live2dModelNone: {
            color: color.text._500,
            fontStyle: 'italic',
        },

        live2dHint: {
            color: color.text._600,
            fontSize: 11,
        },

        live2dImportBtn: {
            flexDirection: 'row',
            alignItems: 'center',
            columnGap: 4,
            paddingHorizontal: 10,
            paddingVertical: 6,
            borderRadius: borderRadius.m,
            borderWidth: 1,
            borderColor: color.primary._500,
        },

        live2dBtnLabel: {
            color: color.primary._500,
            fontSize: 13,
            fontWeight: '600',
        },

        live2dRemoveBtn: {
            padding: 6,
            borderRadius: borderRadius.m,
            borderWidth: 1,
            borderColor: color.error._400,
        },
    })
}

export default ChracterEditorScreen
