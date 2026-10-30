import { useRouter } from 'expo-router'
import { useTranslation } from 'react-i18next'
import { SafeAreaView } from 'react-native-safe-area-context'

import ListButton from '@components/buttons/ListButton'
import ThemedIcon, { type IconName } from '@components/icons/ThemedIcon'
import TText from '@components/text/TText'
import Drawer from '@components/views/Drawer'
import { EdgeFadeFlatList } from '@components/views/EdgeFade'
import HeaderTitle from '@components/views/HeaderTitle'
import { onboardingGuideIds } from '@lib/guides/definitions'
import { useGuideState } from '@lib/guides/state'
import { useOnboardingStore } from '@lib/onboarding/store'
import { Theme } from '@lib/theme/ThemeManager'

const TestScreens = () => {
    const { t } = useTranslation()
    const { color } = Theme.useTheme()
    const router = useRouter()
    const replayGuides = useGuideState((state) => state.replay)
    const restartOnboarding = useOnboardingStore((state) => state.restart)
    const setShow = Drawer.useDrawerStore((state) => state.setShow)
    const returnHome = (prepare: () => void) => {
        setShow(Drawer.ID.SETTINGS, false)
        setShow(Drawer.ID.CHATLIST, false)
        prepare()
        if (router.canDismiss()) router.dismissAll()
        router.replace('/')
    }
    const items: { id: string; label: string; iconName: IconName; onPress: () => void }[] = [
        {
            id: 'components',
            label: t('navigation.dev_components'),
            iconName: 'appstore',
            onPress: () => router.push('/screens/TestScreens/Components'),
        },
        {
            id: 'colours',
            label: t('navigation.dev_colortest'),
            iconName: 'bg-colors',
            onPress: () => router.push('/screens/TestScreens/Colours'),
        },
        {
            id: 'markdown',
            label: t('navigation.dev_markdown'),
            iconName: 'file-markdown',
            onPress: () => router.push('/screens/TestScreens/Markdown'),
        },
        {
            id: 'onboarding',
            label: t('navigation.dev_onboarding'),
            iconName: 'rocket',
            onPress: () => returnHome(restartOnboarding),
        },
        {
            id: 'guides',
            label: t('navigation.dev_guides'),
            iconName: 'bulb',
            onPress: () => returnHome(() => replayGuides(onboardingGuideIds)),
        },
    ]
    return (
        <SafeAreaView edges={['bottom']} style={{ flex: 1 }}>
            <HeaderTitle title={t('navigation.dev_tests')} />
            <EdgeFadeFlatList
                containerStyle={{ flex: 1 }}
                contentContainerStyle={{ paddingHorizontal: 16, paddingVertical: 16, rowGap: 8 }}
                data={items}
                keyExtractor={(item) => item.id}
                renderItem={({ item }) => (
                    <ListButton
                        active={false}
                        onPress={item.onPress}
                        style={{
                            paddingHorizontal: 16,
                            paddingVertical: 14,
                            columnGap: 12,
                            alignItems: 'center',
                        }}>
                        <ThemedIcon iconName={item.iconName} />
                        <TText style={{ flex: 1 }}>{item.label}</TText>
                        <ThemedIcon iconName="right" size={14} color={color.text._400} />
                    </ListButton>
                )}
            />
        </SafeAreaView>
    )
}

export default TestScreens
