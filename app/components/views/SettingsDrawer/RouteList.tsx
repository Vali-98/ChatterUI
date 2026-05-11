import { AntDesign } from '@expo/vector-icons'
import { Href, useRouter } from 'expo-router'
import { useTranslation } from 'react-i18next'
import { FlatList, StyleSheet, Text, TouchableOpacity } from 'react-native'
import { useMMKVBoolean } from 'react-native-mmkv'
import Animated, { Easing, SlideInLeft } from 'react-native-reanimated'

import { AppSettings } from '@lib/constants/GlobalValues'
import { useAppMode } from '@lib/state/AppMode'
import { Theme } from '@lib/theme/ThemeManager'

type ButtonData = {
    name: string
    path: Href
    icon?: keyof typeof AntDesign.glyphMap
}

type DrawerButtonProps = {
    item: ButtonData
    index: number
}

const DrawerButton = ({ item, index }: DrawerButtonProps) => {
    const styles = useStyles()
    const router = useRouter()
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
                    router.push(item.path)
                }}>
                <AntDesign size={24} name={item.icon ?? 'question'} color={color.text._400} />
                <Text style={styles.largeButtonText}>{item.name}</Text>
            </TouchableOpacity>
        </Animated.View>
    )
}

const RouteList = () => {
    const { t } = useTranslation()
    const [devMode] = useMMKVBoolean(AppSettings.DevMode)
    const { appMode } = useAppMode()
    const paths = getPaths(appMode === 'remote', t)
    return (
        <FlatList
            showsVerticalScrollIndicator={false}
            data={__DEV__ || devMode ? [...paths, ...paths_dev(t)] : paths}
            renderItem={({ item, index }) => <DrawerButton item={item} index={index} />}
            keyExtractor={(item) => item.path.toString()}
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
        },
    })
}

const getPaths = (remote: boolean, t: (input: string) => string): ButtonData[] => [
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

const paths_dev = (t: any): ButtonData[] => [
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
