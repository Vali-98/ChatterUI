import { FlashList } from '@shopify/flash-list'
import { useTranslation } from 'react-i18next'
import { Text, View } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { useShallow } from 'zustand/react/shallow'

import Alert from '@components/views/Alert'
import ContextMenu from '@components/views/ContextMenu'
import HeaderButton from '@components/views/HeaderButton'
import HeaderTitle from '@components/views/HeaderTitle'
import { Logger, LogLevel } from '@lib/state/Logger'
import { Theme } from '@lib/theme/ThemeManager'
import { saveStringToDownload } from '@lib/utils/File'

const LogsScreen = () => {
    const { t } = useTranslation()
    const { color } = Theme.useTheme()
    const { logs, flushLogs } = Logger.useLoggerStore(
        useShallow((state) => ({
            logs: state.logs,
            flushLogs: state.flushLogs,
        }))
    )

    const handleExportLogs = () => {
        if (!logs) return
        const data = logs
            .map((item) => `${Logger.LevelName[item.level]} ${item.timestamp}: ${item.message}`)
            .join('\n')
        saveStringToDownload(data, `logs-chatterui-${Date.now()}.txt`, 'utf8')
            .then(() => {
                Logger.infoToast(t('logs.toast.downloadok'))
            })
            .catch((e) => {
                Logger.errorToast(t('logs.toast.downloaderror'), JSON.stringify(e))
            })
    }

    const handleFlushLogs = () => {
        Alert.alert({
            title: t('logs.alert.delete.title'),
            description: t('logs.alert.delete.description'),
            buttons: [
                { label: t('common.cancel') },
                {
                    label: t('logs.alert.delete.title'),
                    onPress: async () => {
                        flushLogs()
                    },
                    type: 'warning',
                },
            ],
        })
    }

    const logColor: Record<LogLevel, string> = {
        [LogLevel.INFO]: 'white',
        [LogLevel.WARN]: 'yellow',
        [LogLevel.ERROR]: 'red',
        [LogLevel.DEBUG]: 'gray',
    }

    const headerRight = () => (
        <ContextMenu
            placement="bottom"
            triggerIcon="setting"
            buttons={[
                {
                    label: t('logs.export'),
                    icon: 'export',
                    onPress: (close) => {
                        handleExportLogs()
                        close()
                    },
                },
                {
                    label: t('logs.flush'),
                    icon: 'delete',
                    onPress: (close) => {
                        handleFlushLogs()
                        close()
                    },
                    variant: 'warning',
                },
            ]}
        />
    )

    return (
        <SafeAreaView
            edges={['bottom']}
            style={{
                flex: 1,
            }}>
            <HeaderTitle title={t('logs.title')} />
            <HeaderButton headerRight={headerRight} />
            <View
                style={{
                    borderColor: color.primary._500,
                    borderWidth: 1,
                    borderRadius: 16,
                    flex: 1,
                    margin: 16,
                    backgroundColor: '#000',

                    padding: 16,
                }}>
                <FlashList
                    maintainVisibleContentPosition={{ startRenderingFromBottom: true }}
                    data={logs}
                    keyExtractor={(item, index) => index.toString()}
                    renderItem={({ item }) => (
                        <Text
                            style={{
                                fontSize: 12,
                                color: logColor[item.level],
                            }}>
                            {Logger.LevelName[item.level]} {item.timestamp}: {item.message}
                        </Text>
                    )}
                />
            </View>
        </SafeAreaView>
    )
}

export default LogsScreen
