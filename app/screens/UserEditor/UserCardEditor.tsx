import ThemedButton from '@components/buttons/ThemedButton'
import ThemedTextInput from '@components/input/ThemedTextInput'
import Alert from '@components/views/Alert'
import Avatar from '@components/views/Avatar'
import PopupMenu from '@components/views/PopupMenu'
import { AntDesign } from '@expo/vector-icons'
import { useViewerState } from '@lib/state/AvatarViewer'
import { CharacterCardData, Characters } from '@lib/state/Characters'
import { Theme } from '@lib/theme/ThemeManager'
import AvatarViewer from '@screens/ChatMenu/ChatWindow/AvatarViewer'
import * as DocumentPicker from 'expo-document-picker'
import React, { useEffect, useState } from 'react'
import { StyleSheet, Text, View } from 'react-native'
import { useShallow } from 'zustand/react/shallow'

const UserCardEditor = () => {
    const styles = useStyles()
    const { color, spacing } = Theme.useTheme()

    const { userCard, imageID, id, setCard, updateImage } = Characters.useUserCard(
        useShallow((state) => ({
            userCard: state.card,
            imageID: state.card?.image_id ?? 0,
            id: state.id,
            setCard: state.setCard,
            updateImage: state.updateImage,
        }))
    )

    const [currentCard, setCurrentCard] = useState<CharacterCardData | undefined>(userCard)

    const setShowViewer = useViewerState((state) => state.setShow)

    useEffect(() => {
        setCurrentCard(userCard)
    }, [id])

    const saveCard = async () => {
        if (currentCard && id) {
            await Characters.db.mutate.updateCard(currentCard, id)
            setCard(id)
        }
    }

    const handleUploadImage = () => {
        DocumentPicker.getDocumentAsync({
            copyToCacheDirectory: true,
            type: 'image/*',
        }).then((result) => {
            if (result.canceled) return
            if (id) updateImage(result.assets[0].uri)
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
                        Characters.deleteImage(imageID)
                    },
                    type: 'warning',
                },
            ],
        })
    }

    return (
        <View style={styles.userContainer}>
            <AvatarViewer editorButton={false} />
            <View style={styles.nameBar}>
                <PopupMenu
                    placement="right"
                    options={[
                        {
                            label: 'Change Image',
                            icon: 'picture',
                            onPress: (menu) => {
                                menu.current?.close()
                                handleUploadImage()
                            },
                        },
                        {
                            label: 'View Image',
                            icon: 'search1',
                            onPress: (menu) => {
                                menu.current?.close()
                                setShowViewer(true, true)
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
                        targetImage={Characters.getImageDir(imageID)}
                        style={styles.userImage}
                    />
                    <AntDesign name="edit" color={color.text._100} style={styles.editHover} />
                </PopupMenu>
                <ThemedTextInput
                    multiline
                    numberOfLines={10}
                    label="Name"
                    value={currentCard?.name ?? ''}
                    onChangeText={(text) => {
                        if (currentCard)
                            setCurrentCard({
                                ...currentCard,
                                name: text,
                            })
                    }}
                    placeholder="Empty names are discouraged!"
                />
            </View>
            <ThemedTextInput
                multiline
                numberOfLines={10}
                label="Description"
                value={currentCard?.description ?? ''}
                onChangeText={(text) => {
                    if (currentCard)
                        setCurrentCard({
                            ...currentCard,
                            description: text,
                        })
                }}
                placeholder="Describe this user..."
            />
            <View style={{ flex: 1, paddingBottom: spacing.m }} />
            <Text
                style={{
                    color: color.text._400,
                    marginTop: spacing.xl2,
                    alignSelf: 'center',
                }}>
                Hint: Swipe Left or press <AntDesign name="menu-unfold" size={16} /> to open the
                Users drawer
            </Text>
            <ThemedButton label="Save" onPress={saveCard} iconName="save" />
        </View>
    )
}

export default UserCardEditor

const useStyles = () => {
    const { color, spacing, borderWidth, borderRadius } = Theme.useTheme()

    return StyleSheet.create({
        userContainer: {
            flex: 1,
            paddingVertical: spacing.xl,
            paddingHorizontal: spacing.xl,
            rowGap: 16,
        },

        nameBar: {
            flexDirection: 'row',
            columnGap: 24,
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
