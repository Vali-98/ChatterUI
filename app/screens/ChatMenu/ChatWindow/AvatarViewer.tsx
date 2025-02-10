import ThemedButton from '@components/buttons/ThemedButton'
import Avatar from '@components/views/Avatar'
import FadeBackrop from '@components/views/FadeBackdrop'
import { useViewerState } from '@lib/state/AvatarViewer'
import { Characters } from '@lib/state/Characters'
import { Theme } from '@lib/theme/ThemeManager'
import { useRouter } from 'expo-router'
import { useEffect, useState } from 'react'
import { Image, Modal, StyleSheet, Text, View } from 'react-native'
import Animated, { FadeInDown } from 'react-native-reanimated'

type AvatarViewerProps = {
    editorButton?: boolean
}

const AvatarViewer: React.FC<AvatarViewerProps> = ({ editorButton = true }) => {
    const router = useRouter()
    const styles = useStyles()

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
                            <ThemedButton
                                label="Edit Character"
                                iconName="edit"
                                iconSize={18}
                                variant="secondary"
                                onPress={() => {
                                    router.push(
                                        isUser ? '/screens/UserEditor' : '../CharacterEditor'
                                    )
                                    setShow(false)
                                }}
                            />
                        )}

                        <ThemedButton
                            label="Close"
                            iconName="close"
                            iconSize={18}
                            variant="secondary"
                            onPress={() => {
                                setShow(false)
                            }}
                        />
                    </View>
                </Animated.View>
            </View>
        </Modal>
    )
}

export default AvatarViewer

const useStyles = () => {
    const { color, spacing, borderWidth, borderRadius, fontSize } = Theme.useTheme()
    return StyleSheet.create({
        modal: {
            flex: 1,
        },

        mainContainer: {
            flex: 1,
            justifyContent: 'center',
            alignItems: 'center',
        },

        bodyContainer: {
            shadowColor: color.shadow,
            elevation: 10,
            paddingTop: spacing.xl2,
            paddingBottom: spacing.xl,
            paddingHorizontal: spacing.xl2,
            backgroundColor: color.neutral._100,
            borderRadius: borderRadius.xl,
            alignItems: 'center',
        },

        avatar: {
            height: undefined,
            width: '70%',
            borderRadius: spacing.xl,
            borderWidth: borderWidth.m,
            borderColor: color.primary._300,
        },

        name: {
            marginTop: spacing.l,
            fontSize: fontSize.xl,
            fontWeight: '500',
            color: color.text._100,
        },

        buttonContainer: {
            marginTop: spacing.xl,
            flexDirection: 'row',
            columnGap: spacing.l,
        },
    })
}
