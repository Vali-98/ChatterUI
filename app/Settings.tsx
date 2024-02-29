import { FontAwesome } from '@expo/vector-icons'
import { Global, Style, Users } from '@globals'
import { useRouter } from 'expo-router'
import React from 'react'
import { SafeAreaView, View, Text, Image, StyleSheet, TouchableOpacity } from 'react-native'
import { useMMKVString } from 'react-native-mmkv'

const Settings = () => {
    const [userName, setUserName] = useMMKVString(Global.CurrentUser)
    const router = useRouter()

    return (
        <SafeAreaView style={styles.mainContainer}>
            <View style={styles.userContainer}>
                <View style={styles.imageContainer}>
                    <Image
                        style={styles.userImage}
                        source={{ uri: Users.getImageDir(userName ?? '') }}
                    />
                </View>
                <View>
                    <Text style={styles.userName}>{userName}</Text>
                    <View style={styles.buttonContainer}>
                        <TouchableOpacity
                            style={styles.button}
                            onPress={() => router.push('/UserInfo')}>
                            <FontAwesome
                                size={20}
                                name="edit"
                                color={Style.getColor('primary-text1')}
                            />
                        </TouchableOpacity>
                        <TouchableOpacity
                            style={styles.button}
                            onPress={() => router.push('/UserSelector')}>
                            <FontAwesome
                                size={20}
                                name="th-list"
                                color={Style.getColor('primary-text1')}
                            />
                        </TouchableOpacity>
                    </View>
                </View>
            </View>

            <View style={styles.largeButtonContainer}>
                <TouchableOpacity
                    style={styles.largeButton}
                    onPress={() => {
                        router.push('/PresetMenu')
                    }}>
                    <Text style={styles.largeButtonText}>Presets</Text>
                </TouchableOpacity>
                <TouchableOpacity
                    style={styles.largeButton}
                    onPress={() => router.push('/Instruct')}>
                    <Text style={styles.largeButtonText}>Instruct</Text>
                </TouchableOpacity>
                <TouchableOpacity
                    style={styles.largeButton}
                    onPress={() => router.push('/APIMenu')}>
                    <Text style={styles.largeButtonText}>API</Text>
                </TouchableOpacity>
                <TouchableOpacity
                    style={styles.largeButton}
                    onPress={() => router.push('/TTSMenu')}>
                    <Text style={styles.largeButtonText}>TTS</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.largeButton} onPress={() => router.push('/Logs')}>
                    <Text style={styles.largeButtonText}>Logs</Text>
                </TouchableOpacity>

                {__DEV__ && (
                    <TouchableOpacity
                        style={styles.largeButton}
                        onPress={() => router.push('./LorebookMenu')}>
                        <Text style={styles.largeButtonText}>Lorebooks</Text>
                    </TouchableOpacity>
                )}

                <Text
                    style={{
                        alignSelf: 'center',
                        color: Style.getColor('primary-text2'),
                        marginTop: 8,
                    }}>
                    {__DEV__ && 'DEV BUILD\t'}
                    {'v' + require(`../app.json`).expo.version}
                </Text>
            </View>
        </SafeAreaView>
    )
}

export default Settings

const styles = StyleSheet.create({
    mainContainer: {
        flex: 1,
        backgroundColor: Style.getColor('primary-surface1'),
    },

    userContainer: {
        flexDirection: 'row',
        marginBottom: 40,
        margin: 16,
    },

    buttonContainer: {
        flexDirection: 'row',
        marginLeft: 12,
    },

    button: {
        backgroundColor: Style.getColor('primary-surface2'),
        marginRight: 10,
        borderRadius: 4,
        padding: 8,
    },

    userName: {
        fontSize: 20,
        marginTop: 16,
        marginBottom: 8,
        marginLeft: 12,
        color: Style.getColor('primary-text1'),
    },

    imageContainer: {
        width: 108,
        height: 108,
        borderRadius: 54,
        margin: 4,
        borderWidth: 2,
        borderColor: Style.getColor('primary-text1'),
        backgroundColor: Style.getColor('primary-surface2'),
    },

    userImage: {
        width: 108,
        height: 108,
        borderRadius: 54,
    },

    largeButtonContainer: {
        borderTopWidth: 1,
        borderColor: Style.getColor('primary-text2'),
    },

    largeButtonText: {
        fontSize: 20,
        paddingVertical: 12,
        paddingLeft: 30,
        color: Style.getColor('primary-text1'),
    },

    largeButton: {
        borderBottomWidth: 1,
        fontSize: 20,
        borderColor: Style.getColor('primary-text2'),
    },
})
