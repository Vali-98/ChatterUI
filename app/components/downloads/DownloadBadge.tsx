import { router, usePathname } from 'expo-router'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Pressable, View } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'

import ThemedButton from '@components/buttons/ThemedButton'
import TText from '@components/text/TText'
import { ChatControlPanel } from '@components/views/ChatControlColumn'
import ThemedSpinner from '@components/views/ThemedSpinner'
import { useDownloadStore } from '@lib/downloads/store'
import { useOnboardingStore } from '@lib/onboarding/store'
import { DownloadProgress } from './DownloadItem'

const DownloadBadge = () => {
    const { t } = useTranslation()
    const path = usePathname()
    const insets = useSafeAreaInsets()
    const onboarding = useOnboardingStore((state) => state.status)
    const downloads = useDownloadStore((state) => state.downloads)
    const [dismissed, setDismissed] = useState('')
    const unfinished = downloads.filter((item) => item.status !== 'completed')
    const signature = unfinished.map((item) => item.id).join(':')
    if (
        !unfinished.length ||
        dismissed === signature ||
        onboarding === 'inProgress' ||
        path.includes('OnboardingScreen') ||
        path.includes('ModelManagerScreen')
    )
        return null
    const running = unfinished.some(
        (item) => item.status === 'downloading' || item.status === 'pausing'
    )
    const total = unfinished.reduce((sum, item) => sum + item.totalBytes, 0)
    const bytes = unfinished.reduce((sum, item) => sum + item.bytesWritten, 0)
    const progress = total ? Math.min(100, (bytes / total) * 100) : 0
    return (
        <View style={{ position: 'absolute', top: insets.top + 56, right: 12, maxWidth: '90%' }}>
            <ChatControlPanel style={{ flexDirection: 'column', alignItems: 'stretch', gap: 6 }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                    <Pressable
                        accessibilityRole="button"
                        onPress={() => router.push('/screens/ModelManagerScreen')}
                        style={{
                            flexDirection: 'row',
                            alignItems: 'center',
                            gap: 8,
                            flexShrink: 1,
                        }}>
                        {running && <ThemedSpinner />}
                        <TText numberOfLines={1}>
                            {t('downloads.badge', { count: unfinished.length })} ·{' '}
                            {running
                                ? `${Math.floor(progress)}%`
                                : t(
                                      unfinished.some((item) => item.status === 'failed')
                                          ? 'downloads.status.failed'
                                          : 'downloads.status.paused'
                                  )}
                        </TText>
                    </Pressable>
                    <ThemedButton
                        variant="tertiary"
                        iconName="close"
                        iconSize={16}
                        accessibilityLabel={t('common.actions.close')}
                        onPress={() => setDismissed(signature)}
                    />
                </View>
                <DownloadProgress progress={progress} height={4} />
            </ChatControlPanel>
        </View>
    )
}
export default DownloadBadge
