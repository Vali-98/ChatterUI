import { localDownload } from '@vali98/react-native-fs'
import { reloadAppAsync } from 'expo'
import { getDocumentAsync } from 'expo-document-picker'
import { Paths } from 'expo-file-system'
import React from 'react'
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

const dbPath = Paths.document.uri + '/SQLite/db.db'

const exportDB = async (notify: boolean = true) => {
    await localDownload(dbPath.replace('file://', ''))
        .then(() => {
            if (notify) Logger.infoToast('Download Successful!')
        })
        .catch((e: string) => Logger.errorToast('Failed to copy database: ' + e))
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
            title: `WARNING: Different Version`,
            description: `The imported database file has a different app version (${dbAppVersion}) to installed version (${appVersion}).\n\nImporting this database may break or corrupt the database. It is recommended to use the same app version.`,
            buttons: [
                { label: 'Cancel' },
                { label: 'Import Anyways', onPress: copyDB, type: 'warning' },
            ],
        })
    } else copyDB()
}

const rerunMigrations = () => {
    Alert.alert({
        title: `Rerun Migrations`,
        description: `Rerunning migrations may destory your database. Be sure to export a backup.`,
        buttons: [
            { label: 'Cancel' },
            {
                label: 'Rerun Migrations',
                onPress: () => migrateData({ bypass: true }),
                type: 'warning',
            },
        ],
    })
}

const DatabaseSettings = () => {
    const { color, spacing } = Theme.useTheme()
    return (
        <View style={{ rowGap: 8 }}>
            <SectionTitle>Database Management</SectionTitle>

            <Text
                style={{
                    color: color.text._500,
                    paddingBottom: spacing.xs,
                    marginBottom: spacing.m,
                }}>
                WARNING: ensure imported database is from the same app version!
            </Text>
            <ThemedButton
                label="Export Database"
                variant="secondary"
                onPress={() => {
                    Alert.alert({
                        title: `Export Database`,
                        description: `Are you sure you want to export the database file?\n\nIt will automatically be downloaded to Downloads`,
                        buttons: [
                            { label: 'Cancel' },
                            { label: 'Export Database', onPress: exportDB },
                        ],
                    })
                }}
            />

            <ThemedButton
                label="Import Database"
                variant="secondary"
                onPress={async () => {
                    getDocumentAsync({ type: ['application/*'] }).then(async (result) => {
                        if (result.canceled) return
                        Alert.alert({
                            title: `Import Database`,
                            description: `Are you sure you want to import this database? This may will destroy the current database!\n\nA backup will automatically be downloaded.\n\nApp will restart automatically`,
                            buttons: [
                                { label: 'Cancel' },
                                {
                                    label: 'Import',
                                    onPress: () =>
                                        importDB(result.assets[0].uri, result.assets[0].name),
                                    type: 'warning',
                                },
                            ],
                        })
                    })
                }}
            />

            <ThemedButton label="Rerun Migrations" variant="secondary" onPress={rerunMigrations} />
        </View>
    )
}

export default DatabaseSettings
