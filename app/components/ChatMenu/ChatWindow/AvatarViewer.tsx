import Avatar from '@components/Avatar'
import FadeBackrop from '@components/FadeBackdrop'
import { useViewerState } from '@constants/AvatarViewer'
import { AntDesign } from '@expo/vector-icons'
import { Characters, Style } from '@globals'
import { useRouter } from 'expo-router'
import { useEffect, useState } from 'react'
import { StyleSheet, Text, Modal, View, Image, TouchableOpacity } from 'react-native'
import Animated, { FadeInDown } from 'react-native-reanimated'

const AvatarViewer = () => {
    const router = useRouter()

    const { show, setShow, isUser } = useViewerState((state) => ({
        show: state.showViewer,
        setShow: state.setShow,
        isUser: state.isUser,
    }))

    const { charName, charImageId } = Characters.useCharacterCard((state) => ({
        charName: state.card?.data.name,
        charImageId: state.card?.data.image_id,
    }))

    const { userName, userImageId } = Characters.useUserCard((state) => ({
        userName: state.card?.data.name,
        userImageId: state.card?.data.image_id,
    }))

    const [aspectRatio, setAspectRatio] = useState(1)

    const imageId = isUser ? userImageId : charImageId

    const name = isUser ? userName : charName

    useEffect(() => {
        Image.getSize(
            Characters.getImageDir(imageId ?? -1),
            (width, height) => {
                setAspectRatio(width / height)
            },
            () => {
                setAspectRatio(1)
            }
        )
    }, [imageId])

    return (
        <Modal
            style={styles.modal}
            transparent
            statusBarTranslucent
            visible={show}
            onRequestClose={() => setShow(false)}>
            <FadeBackrop handleOverlayClick={() => setShow(false)} />
            <View style={styles.mainContainer}>
                <Animated.View style={styles.bodyContainer} entering={FadeInDown}>
                    <Avatar
                        targetImage={Characters.getImageDir(imageId ?? -1)}
                        style={{ ...styles.avatar, aspectRatio: aspectRatio }}
                    />
                    <Text style={styles.name}>{name}</Text>
                    <View style={styles.buttonContainer}>
                        <TouchableOpacity
                            style={styles.button}
                            onPress={() => {
                                router.push(isUser ? '/components/UserEditor' : '/CharInfo')
                                setShow(false)
                            }}>
                            <Text style={styles.buttonText}>
                                <AntDesign name="edit" /> Edit {isUser ? 'User' : 'Character'}
                            </Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                            style={styles.button}
                            onPress={() => {
                                setShow(false)
                            }}>
                            <Text style={styles.buttonText}>
                                <AntDesign name="close" /> Close
                            </Text>
                        </TouchableOpacity>
                    </View>
                </Animated.View>
            </View>
        </Modal>
    )
}

export default AvatarViewer

const styles = StyleSheet.create({
    modal: {
        flex: 1,
    },

    mainContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },

    bodyContainer: {
        shadowColor: Style.getColor('primary-shadow'),
        elevation: 10,
        paddingTop: 32,
        paddingBottom: 16,
        paddingHorizontal: 24,
        backgroundColor: Style.getColor('primary-surface2'),
        borderRadius: 16,
        alignItems: 'center',
    },

    avatar: {
        height: undefined,
        width: '70%',
        resizeMode: 'contain',
        borderRadius: 16,
        borderWidth: 2,
        borderColor: Style.getColor('primary-brand'),
    },

    name: {
        marginTop: 12,
        fontSize: 18,
        fontWeight: '500',
        color: Style.getColor('primary-text1'),
    },

    buttonContainer: {
        marginTop: 16,
        flexDirection: 'row',
        columnGap: 12,
    },

    button: {
        paddingVertical: 8,
        paddingHorizontal: 16,
        borderRadius: 8,
        borderWidth: 1,
        borderColor: Style.getColor('primary-brand'),
    },

    buttonText: {
        color: Style.getColor('primary-text1'),
    },
})
