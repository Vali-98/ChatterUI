import ThemedButton from '@components/buttons/ThemedButton'
import ThemedSwitch from '@components/input/ThemedSwitch'
import SectionTitle from '@components/text/SectionTitle'
import Alert from '@components/views/Alert'
import HeaderTitle from '@components/views/HeaderTitle'
import { registerForPushNotificationsAsync } from '@lib/notifications/Notifications'
import { Theme } from '@lib/theme/ThemeManager'
import { AppSettings, Characters, Logger } from '@lib/utils/Global'
import appConfig from 'app.config'
import { copyFile, DocumentDirectoryPath, DownloadDirectoryPath } from 'cui-fs'
import { reloadAppAsync } from 'expo'
import { getDocumentAsync } from 'expo-document-picker'
import { copyAsync, deleteAsync, documentDirectory } from 'expo-file-system'
import { useRouter } from 'expo-router'
import React from 'react'
import { ScrollView, Text, View } from 'react-native'
import { useMMKVBoolean } from 'react-native-mmkv'

const appVersion = appConfig.expo.version

const exportDB = async (notify: boolean = true) => {
    await copyFile(
        `${DocumentDirectoryPath}/SQLite/db.db`,
        `${DownloadDirectoryPath}/${appVersion}-db-backup.db`
    )
        .then(() => {
            if (notify) Logger.log('Download Successful!', true)
        })
        .catch((e) => Logger.log('Failed to copy database: ' + e, true))
}

const importDB = async (uri: string, name: string) => {
    const copyDB = async () => {
        await exportDB(false)
        await deleteAsync(`${documentDirectory}SQLite/db.db`).catch(() => {
            Logger.debug('Somehow the db is already deleted')
        })
        await copyAsync({
            from: uri,
            to: `${documentDirectory}SQLite/db.db`,
        })
            .then(() => {
                Logger.log('Copy Successful, Restarting now.')
                reloadAppAsync()
            })
            .catch((e) => {
                Logger.log(`Failed to import database: ${e}`, true)
            })
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

const AppSettingsMenu = () => {
    const router = useRouter()
    const { color, spacing } = Theme.useTheme()
    const [printContext, setPrintContext] = useMMKVBoolean(AppSettings.PrintContext)
    const [firstMes, setFirstMes] = useMMKVBoolean(AppSettings.CreateFirstMes)
    const [chatOnStartup, setChatOnStartup] = useMMKVBoolean(AppSettings.ChatOnStartup)
    const [autoScroll, setAutoScroll] = useMMKVBoolean(AppSettings.AutoScroll)
    const [sendOnEnter, setSendOnEnter] = useMMKVBoolean(AppSettings.SendOnEnter)
    const [bypassContextLength, setBypassContextLength] = useMMKVBoolean(
        AppSettings.BypassContextLength
    )
    const [notificationOnGenerate, setNotificationOnGenerate] = useMMKVBoolean(
        AppSettings.NotifyOnComplete
    )
    const [notificationSound, setNotificationSound] = useMMKVBoolean(
        AppSettings.PlayNotificationSound
    )
    const [notificationVibrate, setNotificationVibrate] = useMMKVBoolean(
        AppSettings.VibrateNotification
    )
    const [showNotificationText, setShowNotificationText] = useMMKVBoolean(
        AppSettings.ShowNotificationText
    )
    const [authLocal, setAuthLocal] = useMMKVBoolean(AppSettings.LocallyAuthenticateUser)
    const [unlockOrientation, setUnlockOrientation] = useMMKVBoolean(AppSettings.UnlockOrientation)
    const [useLegacyAPI, setUseLegacyAPI] = useMMKVBoolean(AppSettings.UseLegacyAPI)

    return (
        <ScrollView
            style={{
                marginVertical: spacing.xl2,
                paddingHorizontal: spacing.xl2,
                paddingBottom: spacing.xl3,
            }}
            contentContainerStyle={{ rowGap: spacing.sm }}>
            <HeaderTitle title="Settings" />

            <SectionTitle>Style</SectionTitle>
            <ThemedButton
                label="Customize Colors"
                variant="secondary"
                onPress={() => {
                    router.push('/ColorSettings')
                }}
            />

            <SectionTitle>Chat</SectionTitle>

            <ThemedSwitch
                label="Auto Scroll"
                value={autoScroll}
                onValueChange={setAutoScroll}
                description="Autoscrolls text during generations"
            />

            <ThemedSwitch
                label="Use First Message"
                value={firstMes}
                onValueChange={setFirstMes}
                description="Disabling this will make new chats start blank, needed by specific models"
            />

            <ThemedSwitch
                label="Load Chat On Startup"
                value={chatOnStartup}
                onValueChange={setChatOnStartup}
                description="Loads the most recent chat on startup"
            />

            <ThemedSwitch
                label="Send on Enter"
                value={sendOnEnter}
                onValueChange={setSendOnEnter}
                description="Submits messages when Enter is pressed"
            />

            <SectionTitle>Generation</SectionTitle>

            <ThemedSwitch
                label="Print Context"
                value={printContext}
                onValueChange={setPrintContext}
                description="Prints the generation context to logs for debugging"
            />

            <ThemedSwitch
                label="Bypass Context Length"
                value={bypassContextLength}
                onValueChange={setBypassContextLength}
                description="Ignores context length limits when building prompts"
            />

            <ThemedSwitch
                label="Use Legacy API System"
                value={useLegacyAPI}
                onValueChange={setUseLegacyAPI}
                description="Use old API system"
            />

            <SectionTitle>Notifications</SectionTitle>

            <ThemedSwitch
                label="Enable Notifications"
                value={notificationOnGenerate}
                onValueChange={async (value) => {
                    if (!value) {
                        setNotificationOnGenerate(false)
                        return
                    }

                    const granted = await registerForPushNotificationsAsync()
                    if (granted) {
                        setNotificationOnGenerate(true)
                    }
                }}
                description="Sends notifications when the app is in the background"
            />

            {notificationOnGenerate && (
                <View>
                    <ThemedSwitch
                        label="Notification Sound"
                        value={notificationSound}
                        onValueChange={setNotificationSound}
                        description=""
                    />

                    <ThemedSwitch
                        label="Notification Vibration"
                        value={notificationVibrate}
                        onValueChange={setNotificationVibrate}
                        description=""
                    />

                    <ThemedSwitch
                        label="Show Text In Notification"
                        value={showNotificationText}
                        onValueChange={setShowNotificationText}
                        description="Shows generated messages in notifications"
                    />
                </View>
            )}

            <SectionTitle>Character Management</SectionTitle>
            <ThemedButton
                label="Regenerate Default Card"
                variant="secondary"
                onPress={() => {
                    Alert.alert({
                        title: `Regenerate Default Card`,
                        description: `This will add the default AI Bot card to your character list.`,
                        buttons: [
                            { label: 'Cancel' },
                            { label: 'Create Default Card', onPress: Characters.createDefaultCard },
                        ],
                    })
                }}
            />
            <SectionTitle>Database Management</SectionTitle>

            <Text
                style={{
                    color: color.text._500,
                    paddingBottom: spacing.xs,
                    marginBottom: spacing.m,
                }}>
                WARNING: only import if you are certain it's from the same version!
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

            <SectionTitle>Security</SectionTitle>
            <ThemedSwitch
                label="Lock App"
                value={authLocal}
                onValueChange={setAuthLocal}
                description="Requires user authentication to open the app. This will not work if you have no device locks enabled."
            />

            <SectionTitle>Screen</SectionTitle>
            <ThemedSwitch
                label="Unlock Orientation"
                value={unlockOrientation}
                onValueChange={setUnlockOrientation}
                description="Allows landscape on phones (App restart required)"
            />

            <View style={{ paddingVertical: spacing.xl3 }} />
        </ScrollView>
    )
}

export default AppSettingsMenu
