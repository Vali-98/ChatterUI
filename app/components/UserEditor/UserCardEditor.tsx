import Avatar from '@components/Avatar'
import { CharacterCardV2 } from '@constants/Characters'
import { AntDesign } from '@expo/vector-icons'
import { Characters, Style } from '@globals'
import * as DocumentPicker from 'expo-document-picker'
import React, { useEffect, useState } from 'react'
import { View, Text, StyleSheet, TextInput, TouchableOpacity, Dimensions } from 'react-native'
import { useShallow } from 'zustand/react/shallow'

const UserCardEditor = () => {
    const { userCard, imageID, id, setCard } = Characters.useUserCard(
        useShallow((state) => ({
            userCard: state.card,
            imageID: state.card?.data.image_id ?? 0,
            id: state.id,
            setCard: state.setCard,
        }))
    )

    const [currentCard, setCurrentCard] = useState<CharacterCardV2 | undefined>(userCard)

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
            if (id) Characters.useUserCard.getState().updateImage(result.assets[0].uri)
        })
    }

    return (
        <View style={styles.userContainer}>
            <View style={styles.optionsBar}>
                <Avatar targetImage={Characters.getImageDir(imageID)} style={styles.userImage} />

                <View>
                    <Text style={{ color: Style.getColor('primary-text2') }}>Name</Text>
                    <TextInput
                        style={styles.inputName}
                        textAlignVertical="center"
                        textAlign="center"
                        value={currentCard?.data.name ?? ''}
                        onChangeText={(text) => {
                            if (currentCard)
                                setCurrentCard({
                                    ...currentCard,
                                    data: { ...currentCard.data, name: text },
                                })
                        }}
                        placeholder="Empty names are discouraged!"
                        placeholderTextColor={Style.getColor('destructive-brand')}
                    />
                </View>
            </View>

            <View style={styles.inputArea}>
                <Text style={{ color: Style.getColor('primary-text2'), marginTop: 8 }}>
                    Description
                </Text>
                <TextInput
                    style={styles.input}
                    multiline
                    value={currentCard?.data.description ?? ''}
                    onChangeText={(text) => {
                        if (currentCard)
                            setCurrentCard({
                                ...currentCard,
                                data: { ...currentCard.data, description: text },
                            })
                    }}
                    placeholder="Describe this user..."
                    placeholderTextColor={Style.getColor('primary-text2')}
                />
            </View>
            <View style={styles.buttonContainer}>
                <TouchableOpacity style={styles.button} onPress={handleUploadImage}>
                    <AntDesign
                        style={styles.buttonIcon}
                        size={20}
                        name="picture"
                        color={Style.getColor('primary-text2')}
                    />
                    <Text style={{ color: Style.getColor('primary-text1') }}>Change Image</Text>
                </TouchableOpacity>

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
        </View>
    )
}

export default UserCardEditor

const styles = StyleSheet.create({
    userContainer: {
        minHeight: Dimensions.get('screen').height / 3,
        paddingTop: 16,
        paddingHorizontal: 16,
    },

    optionsBar: {
        flexDirection: 'row',
        alignItems: 'center',
        columnGap: 24,
    },

    buttonContainer: {
        marginTop: 12,
        flexDirection: 'row',
        columnGap: 8,
    },

    buttonIcon: {},

    button: {
        flexDirection: 'row',
        flex: 1,
        paddingVertical: 8,
        paddingHorizontal: 12,
        columnGap: 8,
        borderRadius: 8,
        backgroundColor: Style.getColor('primary-surface4'),
    },

    buttonDestructive: {
        flexDirection: 'row',
        columnGap: 8,
        flex: 1,
        paddingVertical: 8,
        paddingHorizontal: 12,
        borderRadius: 8,
        backgroundColor: Style.getColor('destructive-brand'),
    },

    buttonApprove: {
        flexDirection: 'row',
        columnGap: 8,
        flex: 1,
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

    inputName: {
        textAlign: 'center',
        color: Style.getColor('primary-text1'),
        textAlignVertical: 'top',
        borderColor: Style.getColor('primary-brand'),
        borderWidth: 1,
        padding: 8,
        borderRadius: 8,
    },

    inputArea: {
        flex: 1,
    },

    input: {
        flex: 1,
        color: Style.getColor('primary-text1'),
        textAlignVertical: 'top',
        borderColor: Style.getColor('primary-brand'),
        borderWidth: 1,
        padding: 8,
        borderRadius: 8,
    },

    userListContainer: {},
})
