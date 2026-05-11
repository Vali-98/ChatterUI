import { localDownload } from '@vali98/react-native-fs'
import { reloadAppAsync } from 'expo'
import { getDocumentAsync } from 'expo-document-picker'
import { Paths } from 'expo-file-system'
import React from 'react'
import { useTranslation } from 'react-i18next'
import { Text, View } from 'react-native'

import ThemedButton from '@components/buttons/ThemedButton'
import SectionTitle from '@components/text/SectionTitle'
import Alert from '@components/views/Alert'
import { Logger } from '@lib/state/Logger'
import { Theme } from '@lib/theme/ThemeManager'
import { copyFile, deleteFile } from '@lib/utils/File'
import appConfig from 'app.config'
import { migrateData } from 'db/dataMigrations'

const appVersion = appConfig.expo.version

// eslint-disable-next-line i18next/no-literal-string
const dbPath = Paths.document.uri + '/SQLite/db.db'

const DatabaseSettings = () => {
    const { t } = useTranslation()
    const { color, spacing } = Theme.useTheme()

    const exportDB = async (notify: boolean = true) => {
        await localDownload(dbPath.replace('file://', ''))
            .then(() => {
                if (notify) Logger.infoToast(t('settings.database.toast.downloadOk'))
            })
            .catch((e: string) =>
                Logger.errorToast(t('settings.database.toast.downloadFailed', { error: e }))
            )
    }

    const importDB = async (uri: string, name: string) => {
        const copyDB = async () => {
            await exportDB(false)
            deleteFile(dbPath)
            const result = await copyFile({
                from: uri,
                to: dbPath,
            })
            if (result) reloadAppAsync()
        }

        const dbAppVersion = name.split('-')?.[0]
        if (dbAppVersion !== appVersion) {
            Alert.alert({
                title: t('settings.database.alert.versionMismatch.title'),
                description: t('settings.database.alert.versionMismatch.description', {
                    importedVersion: dbAppVersion,
                    currentVersion: appVersion,
                }),
                buttons: [
                    { label: t('common.cancel') },
                    {
                        label: t('settings.database.alert.versionMismatch.confirm'),
                        onPress: copyDB,
                        type: 'warning',
                    },
                ],
            })
        } else copyDB()
    }

    const rerunMigrations = () => {
        Alert.alert({
            title: t('settings.database.alert.rerunMigrations.title'),
            description: t('settings.database.alert.rerunMigrations.description'),
            buttons: [
                { label: t('common.cancel') },
                {
                    label: t('settings.database.alert.rerunMigrations.confirm'),
                    onPress: () => migrateData({ bypass: true }),
                    type: 'warning',
                },
            ],
        })
    }

    return (
        <View style={{ rowGap: 8 }}>
            <SectionTitle>{t('settings.database.title')}</SectionTitle>

            <Text
                style={{
                    color: color.text._500,
                    paddingBottom: spacing.xs,
                    marginBottom: spacing.m,
                }}>
                {t('settings.database.warningText')}
            </Text>
            <ThemedButton
                label={t('settings.database.exportButton')}
                variant="secondary"
                onPress={() => {
                    Alert.alert({
                        title: t('settings.database.alert.export.title'),
                        description: t('settings.database.alert.export.description'),
                        buttons: [
                            { label: t('common.cancel') },
                            {
                                label: t('settings.database.alert.export.confirm'),
                                onPress: exportDB,
                            },
                        ],
                    })
                }}
            />

            <ThemedButton
                label={t('settings.database.importButton')}
                variant="secondary"
                onPress={async () => {
                    getDocumentAsync({ type: ['application/*'] }).then(async (result) => {
                        if (result.canceled) return
                        Alert.alert({
                            title: t('settings.database.alert.import.title'),
                            description: t('settings.database.alert.import.description'),
                            buttons: [
                                { label: t('common.cancel') },
                                {
                                    label: t('settings.database.alert.import.confirm'),
                                    onPress: () =>
                                        importDB(result.assets[0].uri, result.assets[0].name),
                                    type: 'warning',
                                },
                            ],
                        })
                    })
                }}
            />

            <ThemedButton
                label={t('settings.database.rerunMigrationsButton')}
                variant="secondary"
                onPress={rerunMigrations}
            />
        </View>
    )
}

export default DatabaseSettings
