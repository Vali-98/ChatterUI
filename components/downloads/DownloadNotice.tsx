import { router } from 'expo-router'
import { useTranslation } from 'react-i18next'

import NoticeProgress from '@components/views/NoticeProgress'
import { useDownloadStore } from '@lib/downloads/store'
import { useOnboardingStore } from '@lib/onboarding/store'

const DownloadNotice = () => {
    const { t } = useTranslation()
    const onboarding = useOnboardingStore((state) => state.status)
    const downloads = useDownloadStore((state) => state.downloads)
    if (onboarding === 'inProgress') return null
    return downloads
        .filter((item) => item.status !== 'completed')
        .map((item) => {
            const running = item.status === 'downloading' || item.status === 'pausing'
            const failed = item.status === 'failed'
            return (
                <NoticeProgress
                    key={item.id}
                    previewKey={running ? `download-${item.id}` : undefined}
                    variant={failed ? 'error' : 'primary'}
                    label={`${item.name || t('downloads.badge', { count: 1 })}${running ? '' : ` · ${t(failed ? 'downloads.status.failed' : 'downloads.status.paused')}`}`}
                    progress={
                        item.totalBytes > 0
                            ? (item.bytesWritten / item.totalBytes) * 100
                            : undefined
                    }
                    isRunning={running}
                    iconName="download"
                    showPercentage={running}
                    onPress={() => router.push('/models')}
                    accessibilityLabel={item.name || t('downloads.badge', { count: 1 })}
                />
            )
        })
}
export default DownloadNotice
