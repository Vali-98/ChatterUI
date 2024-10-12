import Avatar from '@components/Avatar'
import { AntDesign } from '@expo/vector-icons'
import { Characters, Style } from '@globals'
import { CharacterCardV2 } from 'app/constants/Characters'
import { useLiveQuery } from 'drizzle-orm/expo-sqlite'
import * as DocumentPicker from 'expo-document-picker'
import { Stack, useRouter } from 'expo-router'
import { useEffect, useState } from 'react'
import {
    View,
    Text,
    TouchableOpacity,
    StyleSheet,
    TextInput,
    KeyboardAvoidingView,
    Dimensions,
} from 'react-native'
import { FlatList } from 'react-native-gesture-handler'
import Animated from 'react-native-reanimated'
import { useShallow } from 'zustand/react/shallow'

const UserEditor = () => {
    const router = useRouter()

    const { data } = useLiveQuery(Characters.db.query.cardListQuery('user'))

    const { userCard, imageID, id, setCard } = Characters.useUserCard(
        useShallow((state) => ({
            userCard: state.card,
            imageID: state.card?.data.image_id ?? 0,
            id: state.id,
            setCard: state.setCard,
        }))
    )

    const [currentCard, setCurrentCard] = useState<CharacterCardV2 | undefined>(userCard)
    const userName = userCard?.data.name

    useEffect(() => {
        setCurrentCard(userCard)
    }, [])

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
        <KeyboardAvoidingView style={styles.mainContainer}>
            <Stack.Screen
                options={{
                    title: 'Edit User',
                    animation: 'simple_push',
                }}
            />

            <Animated.View style={styles.userContainer}>
                <View style={styles.optionsBar}>
                    <Avatar
                        targetImage={Characters.getImageDir(imageID)}
                        style={styles.userImage}
                    />

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
            </Animated.View>

            <FlatList
                style={styles.userListContainer}
                data={data}
                keyExtractor={(item) => item.id.toString()}
                renderItem={({ item, index }) => (
                    <Text
                        style={{
                            color: 'white',
                        }}>
                        {item.name}
                    </Text>
                )}
            />
        </KeyboardAvoidingView>
    )
}

export default UserEditor

const styles = StyleSheet.create({
    mainContainer: {
        paddingTop: 16,
        paddingHorizontal: 16,
        paddingBottom: 24,
        flex: 1,
    },

    userContainer: {
        minHeight: Dimensions.get('screen').height / 3,
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

    userName: {
        color: Style.getColor('primary-text1'),
        fontSize: 20,
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
