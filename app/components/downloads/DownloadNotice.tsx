import { router } from 'expo-router'
import { useTranslation } from 'react-i18next'
import { View } from 'react-native'

import ThemedButton from '@components/buttons/ThemedButton'
import TText from '@components/text/TText'
import Notice, { CollapsedNotice } from '@components/views/Notice'
import ThemedSpinner from '@components/views/ThemedSpinner'
import { useDownloadNoticeState } from '@lib/downloads/noticeState'
import { useDownloadStore } from '@lib/downloads/store'
import { useOnboardingStore } from '@lib/onboarding/store'
import { DownloadProgress } from './DownloadItem'

const DownloadNotice = () => {
    const { t } = useTranslation()
    const onboarding = useOnboardingStore((state) => state.status)
    const downloads = useDownloadStore((state) => state.downloads)
    const collapsedFor = useDownloadNoticeState((state) => state.collapsedFor)
    const collapse = useDownloadNoticeState((state) => state.collapse)
    const expand = useDownloadNoticeState((state) => state.expand)
    const unfinished = downloads.filter((item) => item.status !== 'completed')
    const signature = unfinished.map((item) => item.id).join(':')
    if (!unfinished.length || onboarding === 'inProgress') return null
    const collapsed = collapsedFor === signature
    const running = unfinished.some(
        (item) => item.status === 'downloading' || item.status === 'pausing'
    )
    const failed = unfinished.some((item) => item.status === 'failed')
    const total = unfinished.reduce((sum, item) => sum + item.totalBytes, 0)
    const bytes = unfinished.reduce((sum, item) => sum + item.bytesWritten, 0)
    const knownTotal = unfinished.every((item) => item.totalBytes > 0)
    const progress = total && knownTotal ? Math.min(100, (bytes / total) * 100) : 0
    const openDownloads = () => {
        router.push('/screens/ModelManagerScreen')
    }
    if (collapsed)
        return (
            <CollapsedNotice
                iconName="download"
                count={unfinished.length}
                variant={failed ? 'error' : 'primary'}
                accessibilityLabel={t('downloads.badge', { count: unfinished.length })}
                onPress={expand}
            />
        )
    return (
        <Notice
            variant={failed ? 'error' : 'primary'}
            onPress={openDownloads}
            accessibilityLabel={t('downloads.badge', { count: unfinished.length })}
            style={{ flexDirection: 'column', alignItems: 'stretch', gap: 6 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                {running && <ThemedSpinner />}
                <TText numberOfLines={1} style={{ flexShrink: 1 }}>
                    {t('downloads.badge', { count: unfinished.length })}
                    {running
                        ? knownTotal
                            ? ` · ${Math.floor(progress)}%`
                            : ''
                        : ` · ${t(failed ? 'downloads.status.failed' : 'downloads.status.paused')}`}
                </TText>
                <ThemedButton
                    variant="tertiary"
                    iconName="close"
                    iconSize={16}
                    accessibilityLabel={t('common.actions.collapse')}
                    onPress={(event) => {
                        event.stopPropagation()
                        collapse(signature)
                    }}
                />
            </View>
            <DownloadProgress progress={progress} height={8} />
        </Notice>
    )
}
export default DownloadNotice
