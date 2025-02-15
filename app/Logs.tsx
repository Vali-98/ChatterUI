import Alert from '@components/views/Alert'
import FadeDownView from '@components/views/FadeDownView'
import HeaderButton from '@components/views/HeaderButton'
import HeaderTitle from '@components/views/HeaderTitle'
import PopupMenu from '@components/views/PopupMenu'
import { Logger, LogLevel } from '@lib/state/Logger'
import { Theme } from '@lib/theme/ThemeManager'
import { saveStringToDownload } from '@lib/utils/File'
import { FlashList } from '@shopify/flash-list'
import { Text, View } from 'react-native'

const Logs = () => {
    const { color } = Theme.useTheme()
    const { logs, flushLogs } = Logger.useLoggerState((state) => ({
        logs: state.logs,
        flushLogs: state.flushLogs,
    }))

    const logitems = logs.toReversed()
    const handleExportLogs = () => {
        if (!logs) return
        const data = logs
            .map((item) => `${Logger.LevelName[item.level]} ${item.timestamp}: ${item.message}`)
            .join('\n')
        saveStringToDownload(data, `logs-chatterui-${Date.now()}.txt`, 'utf8')
            .then(() => {
                Logger.infoToast('Logs Downloaded!')
            })
            .catch((e) => {
                Logger.errorToast(`Could Not Export Logs: ${e}`)
            })
    }

    const handleFlushLogs = () => {
        Alert.alert({
            title: `Delete Logs`,
            description: `Are you sure you want to delete all logs? This cannot be undone.`,
            buttons: [
                { label: 'Cancel' },
                {
                    label: 'Delete Logs',
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
        <PopupMenu
            placement="bottom"
            icon="setting"
            options={[
                {
                    label: 'Export Logs',
                    icon: 'export',
                    onPress: (m) => {
                        handleExportLogs()
                        m.current?.close()
                    },
                },
                {
                    label: 'Flush Logs',
                    icon: 'delete',
                    onPress: (m) => {
                        handleFlushLogs()
                        m.current?.close()
                    },
                    warning: true,
                },
            ]}
        />
    )

    return (
        <FadeDownView style={{ flex: 1 }}>
            <HeaderTitle title="Logs" />
            <HeaderButton headerRight={headerRight} />

            <View
                style={{
                    backgroundColor: '#000',
                    borderColor: color.primary._500,
                    borderWidth: 1,
                    margin: 16,
                    padding: 16,
                    borderRadius: 16,
                    flex: 1,
                }}>
                <FlashList
                    inverted
                    estimatedItemSize={30}
                    data={logitems}
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
        </FadeDownView>
    )
}

export default Logs
