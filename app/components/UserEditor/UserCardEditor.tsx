import Alert from '@components/Alert'
import Avatar from '@components/Avatar'
import AvatarViewer from '@components/ChatMenu/ChatWindow/AvatarViewer'
import PopupMenu from '@components/PopupMenu'
import { AntDesign } from '@expo/vector-icons'
import { useViewerState } from 'constants/AvatarViewer'
import { CharacterCardData } from 'constants/Characters'
import { Characters, Style } from 'constants/Global'
import * as DocumentPicker from 'expo-document-picker'
import React, { useEffect, useState } from 'react'
import { StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native'
import { useShallow } from 'zustand/react/shallow'

const UserCardEditor = () => {
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
            <View style={styles.optionsBar}>
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
                    <AntDesign
                        name="edit"
                        color={Style.getColor('primary-text1')}
                        style={styles.editHover}
                    />
                </PopupMenu>

                <View style={{ flex: 1 }}>
                    <Text style={styles.inputDescription}>Name</Text>
                    <TextInput
                        style={styles.inputName}
                        textAlignVertical="center"
                        textAlign="center"
                        value={currentCard?.name ?? ''}
                        onChangeText={(text) => {
                            if (currentCard)
                                setCurrentCard({
                                    ...currentCard,
                                    name: text,
                                })
                        }}
                        placeholder="Empty names are discouraged!"
                        placeholderTextColor={Style.getColor('destructive-brand')}
                    />
                </View>
            </View>
            <Text style={styles.inputDescription}>Description</Text>
            <TextInput
                style={styles.input}
                multiline
                numberOfLines={10}
                value={currentCard?.description ?? ''}
                onChangeText={(text) => {
                    if (currentCard)
                        setCurrentCard({
                            ...currentCard,
                            description: text,
                        })
                }}
                placeholder="Describe this user..."
                placeholderTextColor={Style.getColor('primary-text2')}
            />
            <Text
                style={{
                    color: Style.getColor('primary-text2'),
                    marginTop: 24,
                    alignSelf: 'center',
                }}>
                Hint: Swipe Left or press <AntDesign name="menu-unfold" size={16} /> to open the
                Users drawer
            </Text>
            <View style={{ flex: 1 }} />
            <TouchableOpacity style={styles.buttonApprove} onPress={saveCard}>
                <AntDesign
                    style={styles.buttonIcon}
                    size={20}
                    name="save"
                    color={Style.getColor('primary-text2')}
                />
                <Text style={{ color: Style.getColor('primary-text1') }}>Save</Text>
            </TouchableOpacity>
        </View>
    )
}

export default UserCardEditor

const styles = StyleSheet.create({
    userContainer: {
        flex: 1,
        paddingTop: 16,
        paddingHorizontal: 16,
    },

    optionsBar: {
        flexDirection: 'row',
        columnGap: 24,
    },

    buttonContainer: {
        marginTop: 32,
        columnGap: 8,
    },

    buttonIcon: {},

    button: {
        marginTop: 12,
        flexDirection: 'row',
        paddingVertical: 8,
        paddingHorizontal: 12,
        columnGap: 8,
        borderRadius: 8,
        backgroundColor: Style.getColor('primary-surface4'),
    },

    buttonApprove: {
        marginTop: 12,
        flexDirection: 'row',
        marginBottom: 24,
        columnGap: 8,
        paddingVertical: 8,
        paddingHorizontal: 12,
        borderRadius: 8,
        backgroundColor: Style.getColor('confirm-brand'),
    },

    userImage: {
        width: 84,
        height: 84,
        borderRadius: 20,
        borderColor: Style.getColor('primary-brand'),
        borderWidth: 2,
    },

    inputDescription: {
        color: Style.getColor('primary-text2'),
        marginTop: 8,
        marginBottom: 4,
    },

    inputName: {
        textAlign: 'center',
        color: Style.getColor('primary-text1'),
        textAlignVertical: 'top',
        borderColor: Style.getColor('primary-brand'),
        borderWidth: 1,
        padding: 8,
        borderRadius: 8,
    },

    input: {
        color: Style.getColor('primary-text1'),
        textAlignVertical: 'top',
        borderColor: Style.getColor('primary-brand'),
        borderWidth: 1,
        padding: 8,
        borderRadius: 8,
    },

    userListContainer: {},

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
