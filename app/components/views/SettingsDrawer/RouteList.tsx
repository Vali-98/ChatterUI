import AntDesign, { AntDesignIconName } from '@react-native-vector-icons/ant-design/static'
import { Href, useRouter } from 'expo-router'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native'
import { useMMKVBoolean } from 'react-native-mmkv'
import Animated, { Easing, FadeInDown, FadeInUp, SlideInLeft } from 'react-native-reanimated'

import Drawer from '@components/views/Drawer'
import { EdgeFadeFlatList } from '@components/views/EdgeFade'
import { onboardingGuideIds } from '@lib/guides/definitions'
import { useGuideState } from '@lib/guides/state'
import { useOnboardingStore } from '@lib/onboarding/store'
import { AppSettings } from '@lib/constants/GlobalValues'
import { useAppMode } from '@lib/state/AppMode'
import { Theme } from '@lib/theme/ThemeManager'

type ButtonData = {
    name: string
    path: Href | ButtonData[]
    onPress?: () => void
    icon?: AntDesignIconName
}

type DrawerButtonProps = {
    item: ButtonData
    index: number
}

const DrawerButton = ({ item, index }: DrawerButtonProps) => {
    const styles = useStyles()
    const router = useRouter()
    const [expanded, setExpanded] = useState(false)
    const { color } = Theme.useTheme()

    return (
        <Animated.View
            key={index}
            entering={SlideInLeft.duration(500 + index * 30)
                .withInitialValues({ originX: index * -150 + -400 })
                .easing(Easing.out(Easing.exp))}>
            <TouchableOpacity
                style={styles.largeButton}
                onPress={() => {
                    if (item.onPress) item.onPress()
                    else if (typeof item.path === 'string') router.push(item.path)
                    else {
                        setExpanded(!expanded)
                    }
                }}>
                <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                    <AntDesign size={24} name={item.icon ?? 'question'} color={color.text._400} />
                    <Text style={styles.largeButtonText}>{item.name}</Text>
                </View>
                {Array.isArray(item.path) && (
                    <AntDesign
                        style={{ padding: 16 }}
                        size={16}
                        name={expanded ? 'up' : 'down'}
                        color={color.text._400}
                    />
                )}
            </TouchableOpacity>
            {Array.isArray(item.path) && expanded && (
                <View>
                    {item.path.map((subitem, index) => (
                        <View key={index} style={{ flexDirection: 'row' }}>
                            <Animated.View
                                entering={FadeInUp.delay(300)
                                    .duration(300)
                                    .easing(Easing.out(Easing.exp))}
                                style={{
                                    width: 30,
                                    borderRightWidth: 2,
                                    borderColor: color.text._700,
                                    maxHeight:
                                        Array.isArray(item.path) && item.path.length - 1 === index
                                            ? '50%'
                                            : 'auto',
                                }}
                            />
                            <DrawerButton item={subitem} index={index} />
                        </View>
                    ))}
                </View>
            )}
        </Animated.View>
    )
}

const RouteList = () => {
    const { t } = useTranslation()
    const [devMode] = useMMKVBoolean(AppSettings.DevMode)
    const { appMode } = useAppMode()
    const router = useRouter()
    const replayGuides = useGuideState((state) => state.replay)
    const restartOnboarding = useOnboardingStore((state) => state.restart)
    const setShow = Drawer.useDrawerStore((state) => state.setShow)
    const forceOnboarding = () => {
        setShow(Drawer.ID.SETTINGS, false)
        setShow(Drawer.ID.CHATLIST, false)
        restartOnboarding()
        if (router.canDismiss()) router.dismissAll()
        router.replace('/')
    }
    const forceGuides = () => {
        setShow(Drawer.ID.SETTINGS, false)
        setShow(Drawer.ID.CHATLIST, false)
        replayGuides(onboardingGuideIds)
        if (router.canDismiss()) router.dismissAll()
        router.replace('/')
    }
    const paths = getPaths(appMode === 'remote', t)
    return (
        <EdgeFadeFlatList
            showsVerticalScrollIndicator={false}
            data={
                __DEV__ || devMode
                    ? [...paths, ...paths_dev(t, forceOnboarding, forceGuides)]
                    : paths
            }
            renderItem={({ item, index }) => <DrawerButton item={item} index={index} />}
            keyExtractor={(item) => `${item.path}:${item.name}`}
        />
    )
}

export default RouteList

const useStyles = () => {
    const { color, spacing, fontSize } = Theme.useTheme()
    return StyleSheet.create({
        largeButtonText: {
            fontSize: fontSize.xl,
            paddingVertical: spacing.l,
            paddingLeft: spacing.xl,
            color: color.text._100,
        },

        largeButton: {
            paddingLeft: spacing.xl,
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'space-between',
        },
    })
}

const getPaths = (remote: boolean, t: (input: string) => string): ButtonData[] => [
    remote
        ? {
              name: t('navigation.api'),
              path: '/screens/ConnectionsManagerScreen',
              icon: 'link',
          }
        : {
              name: t('navigation.models'),
              path: '/screens/ModelManagerScreen',
              icon: 'branches',
          },
    {
        name: t('navigation.sampler'),
        path: '/screens/SamplerManagerScreen',
        icon: 'control',
    },
    {
        name: t('navigation.formatting'),
        path: '/screens/FormattingManagerScreen',
        icon: 'profile',
    },
    {
        name: t('navigation.dataSources'),
        path: [
            {
                name: t('summary.settings'),
                path: '/screens/SummarySettingsScreen',
                icon: 'file-text',
            },
            {
                name: t('navigation.lorebooks'),
                path: '/screens/LorebookManagerScreen',
                icon: 'book',
            },
        ],
        icon: 'file-search',
    },
    {
        name: t('navigation.tts'),
        path: '/screens/TTSManagerScreen',
        icon: 'sound',
    },
    {
        name: t('navigation.logs'),
        path: '/screens/LogsScreen',
        icon: 'code',
    },
    {
        name: t('navigation.about'),
        path: '/screens/AboutScreen',
        icon: 'info-circle',
    },
    {
        name: t('navigation.settings'),
        path: '/screens/AppSettingsScreen',
        icon: 'setting',
    },
]

const paths_dev = (
    t: (key: string) => string,
    forceOnboarding: () => void,
    forceGuides: () => void
): ButtonData[] => [
    { name: t('navigation.dev_guides'), path: '/', icon: 'bulb', onPress: forceGuides },
    { name: t('navigation.dev_onboarding'), path: '/', icon: 'rocket', onPress: forceOnboarding },
    /*{
        name: '[DEV] HF',
        path: '/HFTest',
    },*/
    {
        name: t('navigation.dev_components'),
        path: '/screens/ComponentTestScreen',
    },
    {
        name: t('navigation.dev_colortest'),
        path: '/screens/ColorTestScreen',
    },
    {
        name: t('navigation.dev_markdown'),
        path: '/screens/MarkdownTestScreen',
    },
]
