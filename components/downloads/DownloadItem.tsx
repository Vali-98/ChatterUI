import { useEffect, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { View } from 'react-native'

import IconButton from '@components/buttons/IconButton'
import ThemedButton from '@components/buttons/ThemedButton'
import TText from '@components/text/TText'
import ListCard from '@components/views/ListCard'
import { pauseDownload, removeDownload, resumeDownload } from '@lib/downloads/manager'
import { type Download } from '@lib/downloads/store'
import { Theme } from '@lib/theme/ThemeManager'
import { readableFileSize } from '@lib/utils/File'

export const DownloadProgress = ({
    progress,
    height = 8,
}: {
    progress: number
    height?: number
}) => {
    const { color } = Theme.useTheme()
    return (
        <View
            style={{
                height,
                borderRadius: height / 2,
                backgroundColor: color.neutral._300,
                overflow: 'hidden',
            }}>
            <View
                style={{
                    height: '100%',
                    width: `${Math.max(0, Math.min(100, progress))}%`,
                    backgroundColor: color.primary._500,
                }}
            />
        </View>
    )
}

const DownloadItem = ({ item }: { item: Download }) => {
    const { t } = useTranslation()
    const [resumeFailed, setResumeFailed] = useState(false)
    const attemptedResume = useRef(false)
    const downloading = item.status === 'downloading'
    const waiting = item.status === 'pausing'
    useEffect(() => {
        if (item.status === 'failed' && attemptedResume.current) setResumeFailed(true)
        if (item.status === 'downloading') setResumeFailed(false)
    }, [item.status])
    const toggle = () => {
        if (downloading) void pauseDownload(item.id)
        else {
            attemptedResume.current = !!item.resumeState && !resumeFailed
            void resumeDownload(item.id, resumeFailed)
        }
    }
    return (
        <ListCard
            active={false}
            style={{ padding: 16, flexDirection: 'column', alignItems: 'stretch', gap: 12 }}>
            <TText numberOfLines={1}>{item.name}</TText>
            <TText color="400" size={12}>
                {t(`downloads.status.${item.status}`)} · {readableFileSize(item.bytesWritten)}
                {item.totalBytes > 0 ? ` / ${readableFileSize(item.totalBytes)}` : ''}
            </TText>
            <DownloadProgress
                progress={item.totalBytes ? (item.bytesWritten / item.totalBytes) * 100 : 0}
            />
            {!!item.error && (
                <TText color="400" size={12}>
                    {item.error}
                </TText>
            )}
            {resumeFailed && (
                <TText color="400" size={12}>
                    {t('downloads.restartHint')}
                </TText>
            )}
            <View
                style={{
                    flexDirection: 'row',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                }}>
                <ThemedButton
                    variant="tertiary"
                    label={t(
                        item.status === 'completed'
                            ? 'common.actions.clear'
                            : 'common.actions.cancel'
                    )}
                    disabled={waiting}
                    onPress={() => {
                        void removeDownload(item.id)
                    }}
                />
                {item.status !== 'completed' && (
                    <IconButton
                        variant="secondary"
                        iconName={downloading ? 'pause' : resumeFailed ? 'reload' : 'caret-right'}
                        accessibilityLabel={t(
                            downloading
                                ? 'common.actions.pause'
                                : resumeFailed
                                  ? 'common.actions.restart'
                                  : 'common.actions.resume'
                        )}
                        disabled={waiting}
                        onPress={() => {
                            void toggle()
                        }}
                    />
                )}
            </View>
        </ListCard>
    )
}
export default DownloadItem
