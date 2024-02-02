import * as Application from 'expo-application'
import * as Crypto from 'expo-crypto'
import * as FS from 'expo-file-system'
import * as SystemUI from 'expo-system-ui'
import * as Sharing from 'expo-sharing'
import { Platform, StyleSheet } from 'react-native'

import { API } from './API'
import { Characters } from './Characters'
import { Chats } from './Chats'
import { Global } from './GlobalValues'
import { Instructs } from './Instructs'
import { Presets } from './Presets'
import { Users } from './Users'
import { humanizedISO8601DateTime } from './Utils'
import { Llama } from './llama'
import { mmkv } from './mmkv'
import { Logger } from './Logger'
import { Messages } from './Messages'
export {
    mmkv,
    Presets,
    Instructs,
    Users,
    Characters,
    Chats,
    Global,
    API,
    Llama,
    humanizedISO8601DateTime,
    Logger,
    Messages,
}

/*
    Partition data
    /globals
        |- index.js
        |- Color
        |- Global
        |- API
        |- Presets
        |- Chars
        |- Chats
        |- Users
        |- Filesystem
    
    globals file becoming too crowded
*/

export const enum Color {
    Header = '#1e1e1e',
    Background = '#222',
    Container = '#333',
    BorderColor = '#252525',
    White = '#fff',
    Text = '#fff',
    TextItalic = '#aaa',
    TextQuote = '#e69d17',
    Black = '#000',
    DarkContainer = '#111',
    Offwhite = '#888',
    Button = '#ddd',
    TextWhite = '#fff',
    TextBlack = '#000',
}

export const GlobalStyle = StyleSheet.create({})

// GENERAL FUNCTIONS

// reencrypts mmkv cache, may not be useful

export const resetEncryption = (value = 0) => {
    mmkv.recrypt(Crypto.getRandomBytes(16).toString())
}

// Exports a string to external storage, supports json

export const saveStringExternal = async (
    filename: string,
    filedata: string,
    mimetype = 'application/json'
) => {
    if (Platform.OS === 'android') {
        const permissions = await FS.StorageAccessFramework.requestDirectoryPermissionsAsync()
        if (permissions.granted) {
            const directoryUri = permissions.directoryUri
            await FS.StorageAccessFramework.createFileAsync(directoryUri, filename, mimetype)
                .then(async (fileUri) => {
                    await FS.writeAsStringAsync(fileUri, filedata, {
                        encoding: FS.EncodingType.UTF8,
                    })
                    Logger.log(`File saved sucessfully`, true)
                })
                .catch((e) => {
                    console.log(e)
                })
        }
    } else if (Platform.OS === 'ios') Sharing.shareAsync(filename)
}

// HEADER FOR REQUESTS

export const hordeHeader = () => {
    return {
        'Client-Agent': `ChatterUI:${Application.nativeApplicationVersion}:https://github.com/Vali-98/ChatterUI`,
    }
}

// runs every startup to clear some MMKV values

export const startupApp = () => {
    mmkv.set(Global.CurrentCharacter, 'Welcome')
    mmkv.set(Global.CurrentChat, '')
    mmkv.set(Global.CurrentCharacterCard, JSON.stringify(`{}`))
    mmkv.set(Global.NowGenerating, false)
    mmkv.set(Global.HordeWorkers, JSON.stringify([]))
    mmkv.set(Global.HordeModels, JSON.stringify([]))
    mmkv.set(Global.LocalModelWeights, JSON.stringify({}))
    mmkv.set(Global.Messages, JSON.stringify([]))
    if (mmkv.getString(Global.Logs) === undefined) mmkv.set(Global.Logs, JSON.stringify([]))
    if (mmkv.getString(Global.LorebookNames) === undefined)
        mmkv.set(Global.LorebookNames, JSON.stringify([]))
    if (mmkv.getString(Global.APIType) === undefined) mmkv.set(Global.APIType, API.KAI)
    Llama.setLlamaPreset()
    console.log('Reset values')
    SystemUI.setBackgroundColorAsync(Color.Background)
}

// creates default dirs and default objects

export const initializeApp = async () => {
    await generateDefaultDirectories()

    await Users.getFileList()
        .then((files) => {
            if (files.length > 0) return
            mmkv.set(Global.CurrentUser, Users.defaultUserName)
            mmkv.set(Global.CurrentUserCard, JSON.stringify(Users.defaultUserCard))
            Users.createUser(Users.defaultUserName)
            console.log('Created default User')
        })
        .catch((error) => console.log(`Could not generate default User. Reason: ${error}`))

    await Presets.getFileList()
        .then((files) => {
            if (files.length > 0) return
            mmkv.set(Global.PresetData, JSON.stringify(Presets.defaultPreset()))
            Presets.saveFile('Default', Presets.defaultPreset())
            console.log('Created default Preset')
        })
        .catch((error) => console.log(`Could not generate default Preset. Reason: ${error}`))

    await Instructs.getFileList()
        .then((files) => {
            if (files.length > 0) return
            mmkv.set(Global.CurrentInstruct, JSON.stringify(Instructs.defaultInstruct()))
            mmkv.set(Global.InstructName, 'Default')
            Instructs.saveFile('Default', Instructs.defaultInstruct())
            console.log('Created default Instruct')
        })
        .catch((error) => console.log(`Could not generate default Instruct. Reason: ${error}`))

    await migratePresets()
}

export const generateDefaultDirectories = async () => {
    const dirs = ['characters', 'presets', 'instruct', 'persona', 'lorebooks', 'models']

    dirs.map(async (dir: string) => {
        await FS.makeDirectoryAsync(`${FS.documentDirectory}${dir}`, {})
            .then(() => console.log(`Successfully made directory: ${dir}`))
            .catch(() => {})
    })
}

// Migrate seperated presets from 0.4.2 to unified presets
export const migratePresets = async () => {
    return FS.readDirectoryAsync(`${FS.documentDirectory}presets/kai`)
        .then(async () => {
            // move all files
            // delete /kai /tgwui /novelai
            const dirs = ['/kai', '/tgwui', '/novelai']
            console.log('Migrating old presets.')
            let count = 1
            dirs.map(
                async (dir) =>
                    await FS.readDirectoryAsync(`${FS.documentDirectory}presets${dir}`).then(
                        async (files) => {
                            const names: any = []
                            files.map(async (file) => {
                                if (names.includes(file)) {
                                    await FS.copyAsync({
                                        from: `${FS.documentDirectory}presets${dir}/${file}`,
                                        to: `${FS.documentDirectory}presets/${count}-${file}`,
                                    })
                                    count = count + 1
                                } else {
                                    names.push(file)
                                    await FS.copyAsync({
                                        from: `${FS.documentDirectory}presets${dir}/${file}`,
                                        to: `${FS.documentDirectory}presets/${file}`,
                                    })
                                }
                            })
                            await FS.deleteAsync(`${FS.documentDirectory}presets${dir}`)
                        }
                    )
            )
            console.log('Migration successful.')
        })
        .catch(() => {})
}
