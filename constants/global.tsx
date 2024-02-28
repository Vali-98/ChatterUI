import * as Crypto from 'expo-crypto'
import * as FS from 'expo-file-system'
import * as SystemUI from 'expo-system-ui'
import * as Sharing from 'expo-sharing'
import { Platform, StyleSheet } from 'react-native'

import { API } from './API'
import { Characters } from './Characters'
import { Chats } from './Chat'
import { Global } from './GlobalValues'
import { Instructs } from './Instructs'
import { Presets } from './Presets'
import { Users } from './Users'
import { humanizedISO8601DateTime } from './Utils'
import { Llama } from './llama'
import { mmkv } from './mmkv'
import { Logger } from './Logger'
import { LlamaTokenizer } from './tokenizer'
import { Style, ComponentStyle } from './Style'
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
    LlamaTokenizer,
    Style,
    ComponentStyle,
}

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
    ButtonDisabled = '#353535',
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
                    Logger.log(e)
                })
        }
    } else if (Platform.OS === 'ios') Sharing.shareAsync(filename)
}

// runs every startup to clear some MMKV values

export const startupApp = () => {
    mmkv.set(Global.CurrentCharacter, 'Welcome')
    mmkv.set(Global.CurrentCharacterCard, JSON.stringify(`{}`))
    mmkv.set(Global.HordeWorkers, JSON.stringify([]))
    mmkv.set(Global.HordeModels, JSON.stringify([]))
    if (mmkv.getString(Global.OpenAIModel) === undefined)
        mmkv.set(Global.OpenAIModel, JSON.stringify({}))
    mmkv.set(
        Global.PresetData,
        Presets.fixPreset(JSON.parse(mmkv.getString(Global.PresetData) ?? '{}'))
    )
    if (mmkv.getString(Global.HordeKey) === undefined) mmkv.set(Global.HordeKey, '0000000000')
    if (mmkv.getString(Global.Logs) === undefined) mmkv.set(Global.Logs, JSON.stringify([]))
    if (mmkv.getString(Global.LorebookNames) === undefined)
        mmkv.set(Global.LorebookNames, JSON.stringify([]))
    if (mmkv.getString(Global.APIType) === undefined) mmkv.set(Global.APIType, API.KAI)
    Llama.setLlamaPreset()
    Logger.log('Resetting state values for startup.')
    SystemUI.setBackgroundColorAsync(Style.getColor('primary-surface1'))
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
            Logger.log('Created default User')
        })
        .catch((error) => Logger.log(`Could not generate default User. Reason: ${error}`))

    await Presets.getFileList()
        .then((files) => {
            if (files.length > 0) return
            mmkv.set(Global.PresetData, JSON.stringify(Presets.defaultPreset()))
            Presets.saveFile('Default', Presets.defaultPreset())
            Logger.log('Created default Preset')
        })
        .catch((error) => Logger.log(`Could not generate default Preset. Reason: ${error}`))

    await Instructs.getFileList()
        .then((files) => {
            if (files.length > 0) return
            mmkv.set(Global.CurrentInstruct, JSON.stringify(Instructs.defaultInstruct()))
            mmkv.set(Global.InstructName, 'Default')
            Instructs.saveFile('Default', Instructs.defaultInstruct())
            Logger.log('Created default Instruct')
        })
        .catch((error) => Logger.log(`Could not generate default Instruct. Reason: ${error}`))

    await migratePresets()
}

export const generateDefaultDirectories = async () => {
    const dirs = ['characters', 'presets', 'instruct', 'persona', 'lorebooks', 'models']

    dirs.map(async (dir: string) => {
        await FS.makeDirectoryAsync(`${FS.documentDirectory}${dir}`, {})
            .then(() => Logger.log(`Successfully made directory: ${dir}`))
            .catch(() => {})
    })
}

// Migrate seperated presets from 0.4.2 to unified presets
// few use, probably safe to delete
export const migratePresets = async () => {
    return FS.readDirectoryAsync(`${FS.documentDirectory}presets/kai`)
        .then(async () => {
            // move all files
            // delete /kai /tgwui /novelai
            const dirs = ['/kai', '/tgwui', '/novelai']
            Logger.log('Migrating old presets.')
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
            Logger.log('Migration successful.')
        })
        .catch(() => {})
}
