import SupportButton from '@components/buttons/SupportButton'
import Avatar from '@components/views/Avatar'
import Drawer from '@components/views/Drawer'
import { AntDesign } from '@expo/vector-icons'
import { AppMode, AppSettings, Global } from '@lib/constants/GlobalValues'
import { Characters, Style } from '@lib/utils/Global'
import appConfig from 'app.config'
import { Href, useRouter } from 'expo-router'
import { SetStateAction } from 'react'
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native'
import { useMMKVBoolean, useMMKVString } from 'react-native-mmkv'
import Animated, { Easing, SlideInLeft } from 'react-native-reanimated'
import { useShallow } from 'zustand/react/shallow'

type SettingsDrawerProps = {
    booleans: [boolean, (b: boolean | SetStateAction<boolean>) => void]
}

type ButtonData = {
    name: string
    path: Href
    icon?: keyof typeof AntDesign.glyphMap
}

const paths_dev: ButtonData[] = [
    {
        name: '[DEV] Components',
        path: '/ComponentTest',
    },
    {
        name: '[DEV] ColorTest',
        path: '/ColorTest',
    },
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
            userName: state.card?.name,
            imageID: state.card?.image_id ?? 0,
        }))
    )

    const [devMode, setDevMode] = useMMKVBoolean(AppSettings.DevMode)
    const [appMode, setAppMode] = useMMKVString(Global.AppMode)
    const [legacyAPI, setUseLegacyAPI] = useMMKVBoolean(AppSettings.UseLegacyAPI)

    const localMode = appMode === AppMode.LOCAL
    const remoteMode = appMode === AppMode.REMOTE

    const handlePush = (route: any) => {
        router.push(route)
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
            path: '/SamplerMenuNew',
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
                  path: legacyAPI ? '/APIMenu' : '/screens/APIManager',
                  icon: 'link',
              }
            : {
                  name: 'Models',
                  path: '/screens/ModelManager',
                  icon: 'folderopen',
              },
        {
            name: 'TTS',
            path: '/screens/TTSMenu',
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
        {
            name: 'Settings',
            path: '/AppSettingsMenu',
            icon: 'setting',
        },
    ]

    if (showModal)
        return (
            <Drawer setShowDrawer={setShowModal} drawerStyle={{ width: '60%' }}>
                <ScrollView style={{ flex: 1 }} showsVerticalScrollIndicator={false}>
                    <View>
                        <View style={styles.userContainer}>
                            <Avatar
                                targetImage={Characters.getImageDir(imageID)}
                                style={styles.userImage}
                            />
                            <TouchableOpacity
                                style={styles.nameContainer}
                                onPress={() => router.push('/screens/UserEditor')}>
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
                                        localMode ? styles.modeButton : styles.modeButtonInactive
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
                                            localMode ? styles.modeText : styles.modeTextInactive
                                        }>
                                        Local
                                    </Text>
                                </TouchableOpacity>
                                <TouchableOpacity
                                    onPress={() => setAppMode(AppMode.REMOTE)}
                                    style={
                                        remoteMode ? styles.modeButton : styles.modeButtonInactive
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
                                            remoteMode ? styles.modeText : styles.modeTextInactive
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
                                marginTop: 12,
                                marginBottom: 24,
                            }}>
                            {__DEV__ && 'DEV BUILD\t'}
                            {devMode && 'DEV MODE\t'}
                            {'v' + appConfig.expo.version}
                        </Text>
                    </View>
                    <SupportButton />
                </ScrollView>
            </Drawer>
        )
}

export default SettingsDrawer

const styles = StyleSheet.create({
    userContainer: {
        alignItems: 'center',
        columnGap: 12,
        paddingBottom: 16,
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
