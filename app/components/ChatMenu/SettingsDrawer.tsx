import SupportButton from '@components/SupportButton'
import { AppMode, AppSettings, Global } from '@constants/GlobalValues'
import { AntDesign, FontAwesome } from '@expo/vector-icons'
import { Characters, Style } from '@globals'
import appConfig from 'app.config'
import { useRouter } from 'expo-router'
import { SetStateAction, useEffect, useState } from 'react'
import {
    Text,
    GestureResponderEvent,
    TouchableOpacity,
    StyleSheet,
    View,
    Image,
} from 'react-native'
import { useMMKVBoolean, useMMKVString } from 'react-native-mmkv'
import Animated, {
    SlideInLeft,
    Easing,
    SlideOutLeft,
    FadeIn,
    FadeOut,
} from 'react-native-reanimated'
import { useShallow } from 'zustand/react/shallow'

type SettingsDrawerProps = {
    booleans: [boolean, (b: boolean | SetStateAction<boolean>) => void]
}

type ButtonData = {
    name: string
    path: `/${string}`
    icon?: keyof typeof AntDesign.glyphMap
}

const paths_dev: ButtonData[] = [
    {
        name: '[DEV] Lorebooks',
        path: '/LorebookMenu',
    },
    /*{
        name: '[DEV] Embedding',
        path: '/Embedding',
    },*/
]

type DrawerButtonProps = {
    item: ButtonData
    index: number
}

const SettingsDrawer: React.FC<SettingsDrawerProps> = ({ booleans: [showModal, setShowModal] }) => {
    const router = useRouter()
    const { userName, imageID } = Characters.useUserCard(
        useShallow((state) => ({
            userName: state.card?.data.name,
            imageID: state.card?.data.image_id ?? 0,
        }))
    )

    const [devMode, setDevMode] = useMMKVBoolean(AppSettings.DevMode)
    const [appMode, setAppMode] = useMMKVString(Global.AppMode)

    const localMode = appMode === AppMode.LOCAL
    const remoteMode = appMode === AppMode.REMOTE

    const [imageSource, setImageSource] = useState({
        uri: Characters.getImageDir(imageID),
    })

    useEffect(() => {
        setImageSource({
            uri: Characters.getImageDir(imageID),
        })
    }, [imageID])

    const handleImageError = () => {
        setImageSource(require('@assets/user.png'))
    }

    const handleOverlayClick = (e: GestureResponderEvent) => {
        if (e.target === e.currentTarget) setShowModal(false)
    }

    const handlePush = (route: any) => {
        router.navigate(route)
    }

    const DrawerButton = ({ item, index }: DrawerButtonProps) => (
        <Animated.View
            key={index}
            entering={SlideInLeft.duration(500 + index * 30)
                .withInitialValues({ originX: index * -150 + -400 })
                .easing(Easing.out(Easing.exp))}>
            <TouchableOpacity
                style={styles.largeButton}
                onPress={() => {
                    handlePush(item.path)
                }}>
                <AntDesign
                    size={24}
                    name={item.icon ?? 'question'}
                    color={Style.getColor('primary-text2')}
                />
                <Text style={styles.largeButtonText}>{item.name}</Text>
            </TouchableOpacity>
        </Animated.View>
    )

    const paths: ButtonData[] = [
        {
            name: 'Sampler',
            path: '/SamplerMenu',
            icon: 'barschart',
        },
        {
            name: 'Instruct',
            path: '/Instruct',
            icon: 'profile',
        },
        appMode === AppMode.REMOTE
            ? {
                  name: 'API',
                  path: '/APIMenu',
                  icon: 'link',
              }
            : {
                  name: 'Models',
                  path: '/components/ModelManager',
                  icon: 'folderopen',
              },
        {
            name: 'TTS',
            path: '/TTSMenu',
            icon: 'sound',
        },
        {
            name: 'Logs',
            path: '/Logs',
            icon: 'codesquareo',
        },
        {
            name: 'About',
            path: '/About',
            icon: 'infocirlceo',
        },
    ]

    if (showModal)
        return (
            <View style={styles.absolute}>
                <Animated.View
                    entering={FadeIn.duration(300)}
                    exiting={FadeOut.duration(500)}
                    style={styles.absolute}>
                    <TouchableOpacity
                        activeOpacity={1}
                        onPress={handleOverlayClick}
                        style={{
                            backgroundColor: 'rgba(0, 0, 0, 0.5)',
                            ...styles.absolute,
                            justifyContent: 'center',
                        }}
                    />
                </Animated.View>

                <Animated.View
                    style={{
                        backgroundColor: Style.getColor('primary-surface1'),
                        ...styles.absolute,
                        width: '60%',
                        shadowColor: Style.getColor('primary-shadow'),
                        borderTopWidth: 3,
                        elevation: 20,
                    }}
                    entering={SlideInLeft.duration(200).easing(Easing.out(Easing.quad))}
                    exiting={SlideOutLeft.duration(300).easing(Easing.out(Easing.quad))}>
                    <View style={{ justifyContent: 'space-between', flex: 1 }}>
                        <View>
                            <View style={styles.userContainer}>
                                <Image
                                    style={styles.userImage}
                                    source={imageSource}
                                    onError={handleImageError}
                                />
                                <TouchableOpacity
                                    style={styles.nameContainer}
                                    onPress={() => router.push('/components/UserEditor')}>
                                    <Text style={styles.userName}>{userName}</Text>
                                    <AntDesign
                                        name="edit"
                                        color={Style.getColor('primary-text2')}
                                        size={20}
                                    />
                                </TouchableOpacity>
                            </View>
                            <View style={styles.modeContainer}>
                                <Text style={styles.appModeText}>App Mode</Text>
                                <View style={styles.modeButtonContainer}>
                                    <TouchableOpacity
                                        onPress={() => setAppMode(AppMode.LOCAL)}
                                        style={
                                            localMode
                                                ? styles.modeButton
                                                : styles.modeButtonInactive
                                        }>
                                        <AntDesign
                                            name="mobile1"
                                            color={Style.getColor(
                                                localMode ? 'primary-text2' : 'primary-text3'
                                            )}
                                            size={18}
                                        />
                                        <Text
                                            style={
                                                localMode
                                                    ? styles.modeText
                                                    : styles.modeTextInactive
                                            }>
                                            Local
                                        </Text>
                                    </TouchableOpacity>
                                    <TouchableOpacity
                                        onPress={() => setAppMode(AppMode.REMOTE)}
                                        style={
                                            remoteMode
                                                ? styles.modeButton
                                                : styles.modeButtonInactive
                                        }>
                                        <AntDesign
                                            name="cloudo"
                                            color={Style.getColor(
                                                remoteMode ? 'primary-text2' : 'primary-text3'
                                            )}
                                            size={18}
                                        />
                                        <Text
                                            style={
                                                remoteMode
                                                    ? styles.modeText
                                                    : styles.modeTextInactive
                                            }>
                                            Remote
                                        </Text>
                                    </TouchableOpacity>
                                </View>
                            </View>

                            {(__DEV__ || devMode ? [...paths, ...paths_dev] : paths).map(
                                (item, index) => (
                                    <DrawerButton item={item} index={index} key={index} />
                                )
                            )}

                            <Text
                                style={{
                                    alignSelf: 'center',
                                    color: Style.getColor('primary-text2'),
                                    marginTop: 8,
                                }}>
                                {__DEV__ && 'DEV BUILD\t'}
                                {devMode && 'DEV MODE\t'}
                                {'v' + appConfig.expo.version}
                            </Text>
                        </View>
                        <SupportButton />
                    </View>
                </Animated.View>
            </View>
        )
}

export default SettingsDrawer

const styles = StyleSheet.create({
    absolute: {
        position: 'absolute',
        width: '100%',
        height: '100%',
    },

    userContainer: {
        alignItems: 'center',
        columnGap: 12,
        paddingBottom: 24,
        paddingTop: 24,
        padding: 16,
    },

    nameContainer: {
        marginTop: 12,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-evenly',
        columnGap: 12,
    },

    userName: {
        fontSize: 20,
        textAlignVertical: 'center',
        color: Style.getColor('primary-text1'),
    },

    userImage: {
        width: 80,
        height: 80,
        borderRadius: 20,
        borderColor: Style.getColor('primary-brand'),
        borderWidth: 2,
    },

    largeButtonText: {
        fontSize: 18,
        paddingVertical: 12,
        paddingLeft: 15,
        color: Style.getColor('primary-text1'),
    },

    largeButton: {
        paddingLeft: 15,
        flexDirection: 'row',
        alignItems: 'center',
    },

    modeContainer: {
        paddingLeft: 12,
        paddingRight: 16,
        marginBottom: 8,
    },

    modeButtonContainer: {
        flexDirection: 'row',
        justifyContent: 'center',
        columnGap: 4,
    },

    modeButton: {
        flexDirection: 'row',
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        columnGap: 8,
        paddingVertical: 8,
        paddingHorizontal: 12,
        borderWidth: 2,
        borderRadius: 8,
        borderColor: Style.getColor('primary-surface4'),
    },

    modeText: {
        color: Style.getColor('primary-text1'),
    },

    modeButtonInactive: {
        flexDirection: 'row',
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        columnGap: 8,
        paddingVertical: 8,
        paddingHorizontal: 12,
        borderWidth: 2,
        borderRadius: 8,
        borderColor: Style.getColor('primary-surface2'),
    },

    modeTextInactive: {
        color: Style.getColor('primary-text3'),
    },

    appModeText: {
        marginLeft: 8,
        color: Style.getColor('primary-text2'),
        marginBottom: 8,
    },
})
