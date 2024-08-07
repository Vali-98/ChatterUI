import { UserCard } from '@constants/Users'
import { FontAwesome } from '@expo/vector-icons'
import { Global, Style, Users } from '@globals'
import * as DocumentPicker from 'expo-document-picker'
import { Stack, useRouter } from 'expo-router'
import { useState } from 'react'
import {
    SafeAreaView,
    View,
    Text,
    Image,
    TouchableOpacity,
    StyleSheet,
    TextInput,
} from 'react-native'
import { useMMKVObject, useMMKVString } from 'react-native-mmkv'

const UserInfo = () => {
    const router = useRouter()
    const [userName, setUserName] = useMMKVString(Global.CurrentUser)
    const [userCard, setUserCard] = useMMKVObject<UserCard>(Global.CurrentUserCard)

    const imageDir = Users.getImageDir(userName ?? '')

    const [imageSource, setImageSource] = useState({
        uri: imageDir,
    })

    const handleImageError = () => {
        setImageSource(require('@assets/user.png'))
    }

    const saveCard = () => {
        if (userName && userCard) Users.saveFile(userName, userCard)
    }

    return (
        <SafeAreaView style={styles.mainContainer}>
            <Stack.Screen
                options={{
                    title: 'Edit User',
                    animation: 'fade',
                }}
            />

            <View style={styles.userContainer}>
                <Image style={styles.userImage} source={imageSource} onError={handleImageError} />
                <View>
                    <Text style={styles.userName}>{userName}</Text>
                    <View style={styles.buttonContainer}>
                        <TouchableOpacity
                            style={styles.button}
                            onPress={() => {
                                saveCard()
                                router.back()
                            }}>
                            <FontAwesome
                                size={20}
                                name="check"
                                color={Style.getColor('primary-text1')}
                            />
                        </TouchableOpacity>
                        <TouchableOpacity
                            style={styles.button}
                            onPress={() => {
                                DocumentPicker.getDocumentAsync({
                                    copyToCacheDirectory: true,
                                    type: 'image/*',
                                }).then((result) => {
                                    if (result.canceled) return
                                    if (userName) Users.copyImage(result.assets[0].uri, userName)
                                })
                            }}>
                            <FontAwesome
                                size={20}
                                name="upload"
                                color={Style.getColor('primary-text1')}
                            />
                        </TouchableOpacity>
                    </View>
                </View>
            </View>
            <View style={styles.inputarea}>
                <Text style={{ color: Style.getColor('primary-text2') }}>Description</Text>
                <TextInput
                    style={styles.input}
                    multiline
                    numberOfLines={6}
                    value={userCard?.description ?? ''}
                    onChangeText={(text) => {
                        if (userCard) setUserCard({ ...userCard, description: text })
                    }}
                    placeholder="----"
                    placeholderTextColor={Style.getColor('primary-text2')}
                />
            </View>
        </SafeAreaView>
    )
}

export default UserInfo

const styles = StyleSheet.create({
    mainContainer: {
        flex: 1,
    },

    userContainer: {
        flexDirection: 'row',
        marginBottom: 40,
        marginTop: 40,
        marginHorizontal: 16,
    },

    buttonContainer: {
        flexDirection: 'row',
        marginLeft: 12,
    },

    button: {
        marginRight: 10,
        padding: 8,
        borderRadius: 8,
        borderColor: Style.getColor('primary-surface3'),
        borderWidth: 1,
    },

    userName: {
        color: Style.getColor('primary-text1'),
        fontSize: 20,
        marginBottom: 8,
        marginLeft: 12,
    },

    userImage: {
        width: 80,
        height: 80,
        borderRadius: 20,
        borderColor: Style.getColor('primary-brand'),
        borderWidth: 2,
    },

    inputarea: {
        paddingHorizontal: 16,
        paddingBottom: 4,
    },

    input: {
        color: Style.getColor('primary-text1'),
        marginTop: 12,
        textAlignVertical: 'top',
        borderColor: Style.getColor('primary-brand'),
        borderWidth: 1,
        padding: 8,
        borderRadius: 8,
    },
})
