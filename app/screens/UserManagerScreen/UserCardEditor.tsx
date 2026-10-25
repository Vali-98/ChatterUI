import AntDesign from '@react-native-vector-icons/ant-design/static'
import * as DocumentPicker from 'expo-document-picker'
import { useNavigation } from 'expo-router'
import { usePreventRemove } from 'expo-router/build/react-navigation'
import { useEffect, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { StyleSheet, View } from 'react-native'
import { useShallow } from 'zustand/react/shallow'

import ThemedButton from '@components/buttons/ThemedButton'
import ThemedTextInput from '@components/input/ThemedTextInput'
import Alert from '@components/views/Alert'
import Avatar from '@components/views/Avatar'
import AvatarViewer from '@components/views/AvatarViewer'
import ContextMenu from '@components/views/ContextMenu'
import { CharacterCard, Characters } from '@lib/state/characters'
import { useAvatarViewerStore } from '@lib/state/components/AvatarViewer'
import { Logger } from '@lib/state/Logger'
import { Theme } from '@lib/theme/ThemeManager'

const UserCardEditor = () => {
    const { t } = useTranslation()
    const styles = useStyles()
    const { color, spacing } = Theme.useTheme()
    const navigation = useNavigation()
    const [isDirty, setIsDirty] = useState(false)
    const { selectedCard, imageId, id } = Characters.useUserStore(
        useShallow((state) => ({
            selectedCard: state.card,
            imageId: state.card?.image_id ?? 0,
            id: state.id,
        }))
    )

    const [cardDraft, setCardDraft] = useState<CharacterCard | undefined>(selectedCard)

    const setShowViewer = useAvatarViewerStore((state) => state.setShow)

    const previousSavedCard = useRef(selectedCard)
    useEffect(() => {
        // A dirty-flag change alone must not reset the draft before DB notifications arrive.
        if (previousSavedCard.current === selectedCard) return
        previousSavedCard.current = selectedCard
        setCardDraft((current) =>
            isDirty && current?.id === selectedCard?.id ? current : selectedCard
        )
    }, [selectedCard, isDirty])

    const updateCardDraft = (card: CharacterCard) => {
        setIsDirty(true)
        setCardDraft(card)
    }

    const handleSaveUserCard = async () => {
        if (cardDraft && id) {
            const saved = await Characters.db.update.card(id, cardDraft)
            if (!saved || Characters.useUserStore.getState().id !== id) return
            setCardDraft(saved)
            setIsDirty(false)
        }
    }

    const handleImportImage = () => {
        DocumentPicker.getDocumentAsync({
            copyToCacheDirectory: true,
            type: 'image/*',
        })
            .then(async (result) => {
                if (result.canceled) return
                if (id) await Characters.actions.updateCardImage(id, result.assets[0].uri)
            })
            .catch((error) => Logger.errorToast(t('common.errors.couldNotGetData'), error))
    }

    const handleDeleteImage = () => {
        Alert.alert({
            title: t('users.edit.image.delete'),
            description: t('users.edit.image.deletedesc'),
            buttons: [
                { label: t('common.actions.cancel') },
                {
                    label: t('users.edit.image.delete'),
                    onPress: async () => {
                        if (cardDraft) {
                            try {
                                await Characters.actions.deleteCardImage(cardDraft.id)
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

    usePreventRemove(isDirty, ({ data }) => {
        if (!selectedCard) return
        Alert.alert({
            title: t('character.editor.dialogs.unsavedChanges.title'),
            description: t('character.editor.dialogs.unsavedChanges.description'),
            buttons: [
                { label: t('common.actions.cancel') },
                {
                    label: t('common.actions.save'),
                    onPress: async () => {
                        await handleSaveUserCard()
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

    return (
        <View style={styles.userContainer}>
            <AvatarViewer editorButton={false} />
            <View style={styles.nameBar}>
                <ContextMenu placement="right">
                    <ContextMenu.Trigger>
                        <Avatar
                            targetImage={Characters.getCardImageUri(imageId)}
                            style={styles.userImage}
                        />
                        <AntDesign name="edit" color={color.text._100} style={styles.editHover} />
                    </ContextMenu.Trigger>
                    <ContextMenu.Body>
                        <ContextMenu.Button
                            label={t('users.edit.image.change')}
                            icon="picture"
                            closeOnPress={false}
                            onPress={(close) => {
                                close()
                                handleImportImage()
                            }}
                        />
                        <ContextMenu.Button
                            label={t('users.edit.image.view')}
                            icon="search"
                            closeOnPress={false}
                            onPress={(close) => {
                                close()
                                setShowViewer(true, true)
                            }}
                        />
                        <ContextMenu.Button
                            label={t('users.edit.image.delete')}
                            icon="delete"
                            closeOnPress={false}
                            onPress={(close) => {
                                close()
                                handleDeleteImage()
                            }}
                            variant="warning"
                        />
                    </ContextMenu.Body>
                </ContextMenu>
                <View style={{ marginLeft: spacing.xl2, rowGap: 12, flex: 1 }}>
                    <View
                        style={{
                            flexDirection: 'row',
                            columnGap: 4,
                        }}>
                        <ThemedButton
                            disabled={!isDirty}
                            iconName="save"
                            iconSize={20}
                            label={t('common.actions.save')}
                            onPress={handleSaveUserCard}
                            variant={isDirty ? 'secondary' : 'disabled'}
                        />
                    </View>

                    <ThemedTextInput
                        style={{ height: 36 }}
                        value={cardDraft?.name ?? ''}
                        onChangeText={(text) => {
                            if (cardDraft)
                                updateCardDraft({
                                    ...cardDraft,
                                    name: text,
                                })
                        }}
                    />
                </View>
            </View>
            <ThemedTextInput
                multiline
                containerStyle={{
                    marginHorizontal: 16,
                }}
                style={{
                    backgroundColor: color.neutral._100,
                    paddingVertical: 12,
                    paddingHorizontal: 12,
                    borderRadius: 8,
                }}
                numberOfLines={10}
                label={t('common.labels.description')}
                value={cardDraft?.description ?? ''}
                onChangeText={(text) => {
                    if (cardDraft)
                        updateCardDraft({
                            ...cardDraft,
                            description: text,
                        })
                }}
                placeholder="Describe this user..."
            />
        </View>
    )
}

export default UserCardEditor

const useStyles = () => {
    const { color, spacing, borderWidth, borderRadius } = Theme.useTheme()

    return StyleSheet.create({
        userContainer: {
            flex: 1,
            paddingHorizontal: spacing.m,
            paddingTop: spacing.m,
            paddingBottom: spacing.s,
            rowGap: 12,
        },

        nameBar: {
            alignContent: 'flex-start',
            borderRadius: borderRadius.xl,
            flexDirection: 'row',
            alignItems: 'center',
            backgroundColor: color.neutral._100,
            paddingVertical: 12,
            paddingHorizontal: 12,
        },

        userImage: {
            width: 84,
            height: 84,
            borderRadius: borderRadius.xl2,
            borderColor: color.primary._500,
            borderWidth: borderWidth.m,
        },

        editHover: {
            position: 'absolute',
            left: '75%',
            top: '75%',
            padding: spacing.m,
            borderColor: color.primary._500,
            borderWidth: borderWidth.s,
            backgroundColor: color.neutral._200,
            borderRadius: spacing.l,
        },
    })
}
