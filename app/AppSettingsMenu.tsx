import { Alert } from '@components/Alert'
import { rawdb } from '@db'
import { copyFile, DocumentDirectoryPath, DownloadDirectoryPath } from '@dr.pogodin/react-native-fs'
import { Style, AppSettings, Logger, Characters } from '@globals'
import appConfig from 'app.config'
import { reloadAppAsync } from 'expo'
import { getDocumentAsync } from 'expo-document-picker'
import { documentDirectory, copyAsync, deleteAsync } from 'expo-file-system'
import { Stack, useRouter } from 'expo-router'
import React from 'react'
import { StyleSheet, Text, View, Switch, TouchableOpacity, ScrollView } from 'react-native'
import { useMMKVBoolean } from 'react-native-mmkv'

const appVersion = appConfig.expo.version

type SwitchComponentProps = {
    title: string
    value: boolean | undefined
    onValueChange: (b: boolean) => void | Promise<void> | undefined
}

const SwitchComponent: React.FC<SwitchComponentProps> = ({ title, value, onValueChange }) => {
    return (
        <View style={{ flexDirection: 'row', paddingVertical: 12 }}>
            <Switch
                trackColor={{
                    false: Style.getColor('primary-surface1'),
                    true: Style.getColor('primary-surface3'),
                }}
                thumbColor={
                    value ? Style.getColor('primary-brand') : Style.getColor('primary-surface3')
                }
                ios_backgroundColor="#3e3e3e"
                onValueChange={onValueChange}
                value={value}
            />
            <Text
                style={{
                    marginLeft: 16,
                    color: Style.getColor(value ? 'primary-text1' : 'primary-text3'),
                }}>
                {title}
            </Text>
        </View>
    )
}

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
    //const [animateEditor, setAnimateEditor] = useMMKVBoolean(AppSettings.AnimateEditor)
    const [saveKV, setSaveKV] = useMMKVBoolean(AppSettings.SaveLocalKV)
    const [printContext, setPrintContext] = useMMKVBoolean(AppSettings.PrintContext)
    const [firstMes, setFirstMes] = useMMKVBoolean(AppSettings.CreateFirstMes)
    const [chatOnStartup, setChatOnStartup] = useMMKVBoolean(AppSettings.ChatOnStartup)
    const [autoloadLocal, setAutoloadLocal] = useMMKVBoolean(AppSettings.AutoLoadLocal)
    const [autoScroll, setAutoScroll] = useMMKVBoolean(AppSettings.AutoScroll)
    const [sendOnEnter, setSendOnEnter] = useMMKVBoolean(AppSettings.SendOnEnter)

    return (
        <ScrollView style={styles.mainContainer}>
            <Stack.Screen options={{ title: 'App Settings' }} />

            <Text style={{ ...styles.sectionTitle, paddingTop: 0 }}>Style</Text>
            {/* Removed as this animation is buggy on Samsung devices, now defaults to no animation */}
            {/*<SwitchComponent
                title="Animate Editor"
                value={animateEditor}
                onValueChange={setAnimateEditor}
            />

            <Text style={styles.subtitle}>
                This will skip the popup animation on the chat editor for compatibility on certain
                devices. Enable if you are experience weird chat editor behavior
            </Text>*/}

            <TouchableOpacity
                style={styles.button}
                onPress={() => {
                    router.push('/ColorSettings')
                }}>
                <Text style={styles.buttonText}>Customize Colors</Text>
            </TouchableOpacity>

            <Text style={styles.sectionTitle}>Chat</Text>

            <SwitchComponent title="Auto Scroll" value={autoScroll} onValueChange={setAutoScroll} />
            <Text style={styles.subtitle}>Autoscrolls text during generations</Text>

            <SwitchComponent
                title="Use First Message"
                value={firstMes}
                onValueChange={setFirstMes}
            />
            <Text style={styles.subtitle}>
                This will make new chats start blank, needed by specific models
            </Text>

            <SwitchComponent
                title="Load Chat On Startup"
                value={chatOnStartup}
                onValueChange={setChatOnStartup}
            />
            <Text style={styles.subtitle}>Loads the most recent chat on startup</Text>

            <SwitchComponent
                title="Send on Enter"
                value={sendOnEnter}
                onValueChange={setSendOnEnter}
            />
            <Text style={styles.subtitle}>Submits messages when Enter is pressed</Text>

            <Text style={styles.sectionTitle}>Generation</Text>

            <SwitchComponent
                title="Load Local Model on Chat"
                value={autoloadLocal}
                onValueChange={setAutoloadLocal}
            />
            <Text style={styles.subtitle}>
                Automatically loads most recently used local model when chatting
            </Text>

            <SwitchComponent title="Save Local KV" value={saveKV} onValueChange={setSaveKV} />
            <Text style={styles.subtitle}>
                Saves the KV cache on generations, allowing you to continue sessions after closing
                the app. You must use the same model for this to function properly. Be warned that
                the KV cache file may be very big and negatively impact battery life!
            </Text>

            <SwitchComponent
                title="Print Context"
                value={printContext}
                onValueChange={setPrintContext}
            />
            <Text style={styles.subtitle}>Prints the generation context to logs for debugging</Text>

            <Text style={styles.sectionTitle}>Character Management</Text>
            <TouchableOpacity
                style={styles.button}
                onPress={() => {
                    Alert.alert({
                        title: `Regenerate Default Card`,
                        description: `This will add the default AI Bot card to your character list.`,
                        buttons: [
                            { label: 'Cancel' },
                            { label: 'Create Default Card', onPress: Characters.createDefaultCard },
                        ],
                    })
                }}>
                <Text style={styles.buttonText}>Regenerate Default Card</Text>
            </TouchableOpacity>

            <Text style={styles.sectionTitle}>Database Management</Text>
            <Text style={styles.subtitle}>
                WARNING: only import if you are certain it's from the same version!
            </Text>
            <TouchableOpacity
                style={styles.button}
                onPress={() => {
                    Alert.alert({
                        title: `Export Database`,
                        description: `Are you sure you want to export the database file?\n\nIt will automatically be downloaded to Downloads`,
                        buttons: [
                            { label: 'Cancel' },
                            { label: 'Export Database', onPress: exportDB },
                        ],
                    })
                }}>
                <Text style={styles.buttonText}>Export Database</Text>
            </TouchableOpacity>

            <TouchableOpacity
                style={styles.button}
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
                                },
                            ],
                        })
                    })
                }}>
                <Text style={styles.buttonText}>Import Database</Text>
            </TouchableOpacity>
            <View style={{ paddingVertical: 60 }} />
        </ScrollView>
    )
}

export default AppSettingsMenu

const styles = StyleSheet.create({
    mainContainer: {
        marginTop: 16,
        paddingHorizontal: 20,
        paddingBottom: 20,
    },

    button: {
        paddingVertical: 8,
        paddingHorizontal: 16,
        backgroundColor: Style.getColor('primary-surface3'),
        borderRadius: 8,
        marginVertical: 8,
    },

    buttonText: {
        color: Style.getColor('primary-text1'),
    },

    sectionTitle: {
        color: Style.getColor('primary-text1'),
        paddingTop: 12,
        fontSize: 16,
        paddingBottom: 6,
        marginBottom: 8,
        borderBottomWidth: 1,
        borderColor: Style.getColor('primary-surface3'),
    },

    subtitle: {
        color: Style.getColor('primary-text2'),
        paddingBottom: 2,
        marginBottom: 8,
    },
})
