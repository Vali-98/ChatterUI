import {
    Text,
    GestureResponderEvent,
    TouchableOpacity,
    Modal,
    StyleSheet,
    View,
    Image,
} from 'react-native'
import Animated, { SlideInLeft, Easing, SlideOutRight } from 'react-native-reanimated'
import { Color, Global, Users } from '@globals'
import { usePathname, useRouter } from 'expo-router'
import { useMMKVString } from 'react-native-mmkv'
import { FontAwesome } from '@expo/vector-icons'
import { SetStateAction, useEffect, useState } from 'react'
type SettingsDrawerProps = {
    booleans: [boolean, (b: boolean | SetStateAction<boolean>) => void]
}

const SettingsDrawer: React.FC<SettingsDrawerProps> = ({ booleans: [showModal, setShowModal] }) => {
    const router = useRouter()

    const [userName, setUserName] = useMMKVString(Global.CurrentUser)
    const handleOverlayClick = (e: GestureResponderEvent) => {
        if (e.target === e.currentTarget) setShowModal(false)
    }

    const handlePush = (route: any) => {
        router.navigate(route)
        setShowModal(false)
    }

    return (
        <Modal
            visible={showModal}
            onRequestClose={() => {
                setShowModal(false)
            }}
            transparent
            animationType={'fade'}>
            <TouchableOpacity
                activeOpacity={1}
                onPress={handleOverlayClick}
                style={{
                    backgroundColor: 'rgba(0, 0, 0, 0.3)',
                    flex: 1,
                    justifyContent: 'center',
                }}>
                <Animated.View
                    style={{ flex: 1, backgroundColor: Color.Background, width: '70%' }}
                    entering={SlideInLeft.duration(200).easing(Easing.out(Easing.quad))}
                    exiting={SlideOutRight.duration(200).easing(Easing.out(Easing.quad))}>
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
                                    onPress={() => handlePush('/UserInfo')}>
                                    <FontAwesome size={20} name="edit" color={Color.Button} />
                                </TouchableOpacity>
                                <TouchableOpacity
                                    style={styles.button}
                                    onPress={() => handlePush('/UserSelector')}>
                                    <FontAwesome size={20} name="th-list" color={Color.Button} />
                                </TouchableOpacity>
                            </View>
                        </View>
                    </View>
                    <TouchableOpacity
                        style={styles.firstlargeButton}
                        onPress={() => {
                            handlePush('/PresetMenu')
                        }}>
                        <Text style={styles.largeButtonText}>Presets</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                        style={styles.largeButton}
                        onPress={() => handlePush('/Instruct')}>
                        <Text style={styles.largeButtonText}>Instruct</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                        style={styles.largeButton}
                        onPress={() => handlePush('/APIMenu')}>
                        <Text style={styles.largeButtonText}>API</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                        style={styles.largeButton}
                        onPress={() => handlePush('/TTSMenu')}>
                        <Text style={styles.largeButtonText}>TTS</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                        style={styles.largeButton}
                        onPress={() => handlePush('/Logs')}>
                        <Text style={styles.largeButtonText}>Logs</Text>
                    </TouchableOpacity>

                    {__DEV__ && (
                        <TouchableOpacity
                            style={styles.largeButton}
                            onPress={() => handlePush('./LorebookMenu')}>
                            <Text style={styles.largeButtonText}>Lorebooks</Text>
                        </TouchableOpacity>
                    )}

                    <Text style={{ alignSelf: 'center', color: Color.Offwhite, marginTop: 8 }}>
                        {__DEV__ && 'DEV BUILD\t'}
                        {'v' + require(`../../app.json`).expo.version}
                    </Text>
                </Animated.View>
            </TouchableOpacity>
        </Modal>
    )
}

export default SettingsDrawer

const styles = StyleSheet.create({
    mainContainer: {
        flex: 1,
        backgroundColor: Color.Background,
    },

    userContainer: {
        flexDirection: 'row',
        marginBottom: 40,
        marginTop: 40,
        margin: 16,
    },

    buttonContainer: {
        flexDirection: 'row',
        marginLeft: 12,
    },

    button: {
        backgroundColor: Color.DarkContainer,
        marginRight: 10,
        borderRadius: 4,
        padding: 8,
    },

    userName: {
        fontSize: 20,
        marginTop: 16,
        marginBottom: 8,
        marginLeft: 12,
        color: Color.Text,
    },

    imageContainer: {
        width: 108,
        height: 108,
        borderRadius: 54,
        margin: 4,
        borderWidth: 2,
        borderColor: Color.White,
        backgroundColor: Color.DarkContainer,
    },

    userImage: {
        width: 108,
        height: 108,
        borderRadius: 54,
    },

    largeButtonContainer: {
        borderTopWidth: 1,
        borderColor: Color.Offwhite,
    },

    largeButtonText: {
        fontSize: 20,
        paddingVertical: 12,
        paddingLeft: 30,
        color: Color.Text,
    },

    largeButton: {
        borderBottomWidth: 1,
        fontSize: 20,
        borderColor: Color.Offwhite,
    },

    firstlargeButton: {
        borderBottomWidth: 1,
        borderTopWidth: 1,
        fontSize: 20,
        borderColor: Color.Offwhite,
    },
})
