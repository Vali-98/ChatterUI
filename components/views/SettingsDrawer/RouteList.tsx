import AntDesign, { AntDesignIconName } from '@react-native-vector-icons/ant-design/static'
import { Href, useRouter } from 'expo-router'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native'
import { useMMKVBoolean } from 'react-native-mmkv'
import Animated, { Easing, FadeInUp, SlideInLeft } from 'react-native-reanimated'

import { EdgeFadeFlatList } from '@components/views/EdgeFade'
import { AppSettings } from '@lib/constants/GlobalValues'
import { useAppMode } from '@lib/state/AppMode'
import { Theme } from '@lib/theme/ThemeManager'

type ButtonData = {
    name: string
    path: Href | ButtonData[]
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
                    if (Array.isArray(item.path)) setExpanded(!expanded)
                    else router.push(item.path)
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
                                entering={FadeInUp.duration(150).easing(Easing.out(Easing.exp))}
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
    const paths = getPaths(appMode === 'remote', t)
    const testScreensLink: ButtonData = {
        name: t('navigation.dev_tests'),
        path: '/screens/TestScreens',
        icon: 'experiment',
    }
    return (
        <EdgeFadeFlatList
            containerStyle={{ flex: 1 }}
            showsVerticalScrollIndicator={false}
            data={__DEV__ || devMode ? [...paths, testScreensLink] : paths}
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
