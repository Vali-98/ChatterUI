import Avatar from '@components/views/Avatar'
import FadeBackrop from '@components/views/FadeBackdrop'
import { useViewerState } from '@lib/storage/AvatarViewer'
import { AntDesign } from '@expo/vector-icons'
import { Characters, Style } from '@lib/utils/Global'
import { useRouter } from 'expo-router'
import { useEffect, useState } from 'react'
import { Image, Modal, StyleSheet, Text, TouchableOpacity, View } from 'react-native'
import Animated, { FadeInDown } from 'react-native-reanimated'

type AvatarViewerProps = {
    editorButton?: boolean
}

const AvatarViewer: React.FC<AvatarViewerProps> = ({ editorButton = true }) => {
    const router = useRouter()

    const { show, setShow, isUser } = useViewerState((state) => ({
        show: state.showViewer,
        setShow: state.setShow,
        isUser: state.isUser,
    }))

    const { charName, charImageId } = Characters.useCharacterCard((state) => ({
        charName: state.card?.name,
        charImageId: state.card?.image_id,
    }))

    const { userName, userImageId } = Characters.useUserCard((state) => ({
        userName: state.card?.name,
        userImageId: state.card?.image_id,
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
            animationType="fade"
            visible={show}
            onRequestClose={() => setShow(false)}>
            <FadeBackrop handleOverlayClick={() => setShow(false)} />
            <View style={styles.mainContainer}>
                <Animated.View style={styles.bodyContainer} entering={FadeInDown}>
                    <Avatar
                        contentFit="cover"
                        targetImage={Characters.getImageDir(imageId ?? -1)}
                        style={[styles.avatar, { aspectRatio: aspectRatio }]}
                    />
                    <Text style={styles.name}>{name}</Text>
                    <View style={styles.buttonContainer}>
                        {editorButton && (
                            <TouchableOpacity
                                style={styles.button}
                                onPress={() => {
                                    router.push(
                                        isUser ? '/screens/UserEditor' : '../CharacterEditor'
                                    )
                                    setShow(false)
                                }}>
                                <AntDesign
                                    name="edit"
                                    size={18}
                                    color={Style.getColor('primary-text2')}
                                />
                                <Text style={styles.buttonText}>
                                    Edit {isUser ? 'User' : 'Character'}
                                </Text>
                            </TouchableOpacity>
                        )}
                        <TouchableOpacity
                            style={styles.button}
                            onPress={() => {
                                setShow(false)
                            }}>
                            <AntDesign
                                name="close"
                                size={18}
                                color={Style.getColor('primary-text2')}
                            />
                            <Text style={styles.buttonText}>Close</Text>
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
        flexDirection: 'row',
        alignItems: 'center',
        columnGap: 4,
        paddingVertical: 8,
        paddingHorizontal: 12,
        borderRadius: 8,
        borderWidth: 1,
        borderColor: Style.getColor('primary-brand'),
    },

    buttonText: {
        color: Style.getColor('primary-text1'),
    },
})
