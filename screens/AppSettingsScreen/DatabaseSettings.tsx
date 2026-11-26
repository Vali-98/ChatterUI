import { getDocumentAsync } from 'expo-document-picker'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Modal, View } from 'react-native'
import { Bar } from 'react-native-progress'

import ThemedButton from '@components/buttons/ThemedButton'
import ThemedSwitchRow from '@components/input/ThemedSwitchRow'
import SectionTitle from '@components/text/SectionTitle'
import TText from '@components/text/TText'
import Alert from '@components/views/Alert'
import {
    exportBackup,
    exportDatabase,
    restoreBackup,
    type BackupProgress,
} from '@lib/backup/actions'
import { Theme } from '@lib/theme/ThemeManager'

const DatabaseSettings = () => {
    const { t } = useTranslation()
    const { color } = Theme.useTheme()
    const [includeApiKeys, setIncludeApiKeys] = useState(false)
    const [activity, setActivity] = useState<{
        stage: Parameters<BackupProgress>[0]
        progress?: number
    }>()
    const run = async (operation: (report: BackupProgress) => Promise<void>) => {
        setActivity({ stage: 'preparing' })
        try {
            await operation((stage, progress) => setActivity({ stage, progress }))
        } catch (error) {
            Alert.alert({
                title: t('settings.backup.failed'),
                description: String(error instanceof Error ? error.message : error),
                buttons: [{ label: t('common.actions.close') }],
            })
        } finally {
            setActivity(undefined)
        }
    }
    const pickRestore = async () => {
        const result = await getDocumentAsync({
            type: ['application/zip', 'application/x-zip-compressed'],
            copyToCacheDirectory: true,
        })
        if (result.canceled) return
        Alert.alert({
            title: t('settings.backup.restore'),
            description: t('settings.backup.replaceWarning'),
            buttons: [
                { label: t('common.actions.cancel') },
                {
                    label: t('settings.backup.restore'),
                    type: 'warning',
                    onPress: () => run((report) => restoreBackup(result.assets[0].uri, report)),
                },
            ],
        })
    }
    return (
        <View style={{ rowGap: 8 }}>
            <SectionTitle>{t('settings.backup.title')}</SectionTitle>
            <TText color="400">{t('settings.backup.description')}</TText>
            <ThemedSwitchRow
                label={t('settings.backup.includeKeys')}
                description={t('settings.backup.keyWarning')}
                value={includeApiKeys}
                onChangeValue={setIncludeApiKeys}
            />
            <ThemedButton
                label={t('settings.backup.export')}
                disabled={!!activity}
                onPress={() =>
                    Alert.alert({
                        title: t('settings.backup.create'),
                        description: t('settings.backup.createDescription'),
                        buttons: [
                            { label: t('common.actions.cancel') },
                            {
                                label: t('common.actions.create'),
                                onPress: () =>
                                    run(async (report) => {
                                        await exportBackup(includeApiKeys, report)
                                        Alert.alert({
                                            title: t('settings.backup.saved'),
                                            description: t('settings.backup.savedDescription'),
                                            buttons: [{ label: t('common.actions.close') }],
                                        })
                                    }),
                            },
                        ],
                    })
                }
            />
            <ThemedButton
                label={t('settings.backup.restore')}
                disabled={!!activity}
                onPress={pickRestore}
            />
            <SectionTitle>{t('settings.backup.databaseTitle')}</SectionTitle>
            <ThemedButton
                label={t('settings.backup.exportDatabase')}
                level="muted"
                disabled={!!activity}
                onPress={() => run(exportDatabase)}
            />
            <Modal visible={!!activity} transparent animationType="fade" onRequestClose={() => {}}>
                <View
                    style={{
                        flex: 1,
                        justifyContent: 'center',
                        paddingHorizontal: 24,
                        backgroundColor: color.neutral._100,
                    }}>
                    {activity && (
                        <View style={{ rowGap: 16 }}>
                            <TText size={24} style={{ textAlign: 'center' }}>
                                {t(`settings.backup.stage.${activity.stage}`)}
                            </TText>
                            <Bar
                                width={null}
                                height={14}
                                borderRadius={7}
                                borderWidth={0}
                                color={color.primary._500}
                                unfilledColor={color.neutral._300}
                                indeterminate={activity.progress === undefined}
                                progress={Math.max(0, Math.min(100, activity.progress ?? 0)) / 100}
                            />
                            {activity.progress !== undefined && (
                                <TText color="400" size={16} style={{ textAlign: 'center' }}>
                                    {`${Math.floor(Math.max(0, Math.min(100, activity.progress)))}%`}
                                </TText>
                            )}
                        </View>
                    )}
                    <TText color="400" style={{ marginTop: 16, textAlign: 'center' }}>
                        {t('settings.backup.keepOpen')}
                    </TText>
                </View>
            </Modal>
        </View>
    )
}
export default DatabaseSettings
