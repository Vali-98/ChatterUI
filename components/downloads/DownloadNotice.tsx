import { router } from 'expo-router'
import { useTranslation } from 'react-i18next'

import NoticeProgress from '@components/views/NoticeProgress'
import { useDownloadStore } from '@lib/downloads/store'
import { useOnboardingStore } from '@lib/onboarding/store'

const DownloadNotice = () => {
    const { t } = useTranslation()
    const onboarding = useOnboardingStore((state) => state.status)
    const downloads = useDownloadStore((state) => state.downloads)
    const unfinished = downloads.filter((item) => item.status !== 'completed')
    if (!unfinished.length || onboarding === 'inProgress') return null
    const running = unfinished.some(
        (item) => item.status === 'downloading' || item.status === 'pausing'
    )
    const failed = unfinished.some((item) => item.status === 'failed')
    const total = unfinished.reduce((sum, item) => sum + item.totalBytes, 0)
    const bytes = unfinished.reduce((sum, item) => sum + item.bytesWritten, 0)
    const knownTotal = unfinished.every((item) => item.totalBytes > 0)
    const progress = total && knownTotal ? Math.min(100, (bytes / total) * 100) : undefined
    const openDownloads = () => {
        router.push('/models')
    }
    return (
        <NoticeProgress
            variant={failed ? 'error' : 'primary'}
            label={`${t('downloads.badge', { count: unfinished.length })}${running ? '' : ` · ${t(failed ? 'downloads.status.failed' : 'downloads.status.paused')}`}`}
            progress={progress}
            isRunning={running}
            iconName="download"
            showPercentage={running}
            onPress={openDownloads}
            accessibilityLabel={t('downloads.badge', { count: unfinished.length })}
        />
    )
}
export default DownloadNotice
