import { Style, AppSettings, Logger } from '@globals'
import { reloadAppAsync } from 'expo'
import { getDocumentAsync } from 'expo-document-picker'
import { documentDirectory, copyAsync, deleteAsync } from 'expo-file-system'
import { Stack } from 'expo-router'
import React from 'react'
import { StyleSheet, Text, View, Switch, TouchableOpacity, Alert } from 'react-native'
import ReactNativeBlobUtil from 'react-native-blob-util'
import { useMMKVBoolean } from 'react-native-mmkv'

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

const WarningAlert = (title: string, description: string, onPress: () => void) => {
    Alert.alert(title, description, [
        { text: `Cancel`, style: `cancel` },
        {
            text: `Confirm`,
            style: `destructive`,
            onPress: onPress,
        },
    ])
}

const AppSettingsMenu = () => {
    const [animateEditor, setAnimateEditor] = useMMKVBoolean(AppSettings.AnimateEditor)
    const [firstMes, setFirstMes] = useMMKVBoolean(AppSettings.CreateFirstMes)

    const importDB = async (uri: string) => {
        await deleteAsync(`${documentDirectory}SQLite/db.db`)
        console.log(uri)

        await copyAsync({
            from: uri,
            to: `${documentDirectory}SQLite/db.db`,
        }).then(() => {
            Logger.log('Copy Successful, Restarting now.')
            reloadAppAsync()
        })
    }

    return (
        <View style={styles.mainContainer}>
            <Stack.Screen options={{ title: 'App Settings' }} />

            <SwitchComponent
                title="Animate Editor"
                value={animateEditor}
                onValueChange={setAnimateEditor}
            />
            <SwitchComponent
                title="Use First Message"
                value={firstMes}
                onValueChange={setFirstMes}
            />

            <TouchableOpacity
                style={styles.button}
                onPress={async () => {
                    ReactNativeBlobUtil.MediaCollection.copyToMediaStore(
                        {
                            name: 'db.db',
                            parentFolder: '',
                            mimeType: 'application/x-sqlite3',
                        },
                        'Download',
                        `${documentDirectory}SQLite/db.db`
                    ).then(() => {
                        Logger.log('Download Successful!', true)
                    })
                }}>
                <Text style={styles.buttonText}>Export Database</Text>
            </TouchableOpacity>

            <TouchableOpacity
                style={styles.button}
                onPress={async () => {
                    getDocumentAsync({ type: ['application/*'] }).then(async (result) => {
                        if (result.canceled) return
                        WarningAlert(
                            `Import Database`,
                            `Are you sure you want to import this database? This may will destroy the current database!\nApp will restart automatically`,
                            () => importDB(result.assets[0].uri)
                        )
                    })
                }}>
                <Text style={styles.buttonText}>Import Database</Text>
            </TouchableOpacity>
        </View>
    )
}

export default AppSettingsMenu

const styles = StyleSheet.create({
    mainContainer: {
        marginVertical: 16,
        paddingVertical: 16,
        paddingHorizontal: 20,
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
})
