import * as Crypto from 'expo-crypto'
import * as FS from 'expo-file-system'
import * as SystemUI from 'expo-system-ui'
import * as Sharing from 'expo-sharing'
import { Platform, StyleSheet } from 'react-native'

import { API } from './API'
import { Characters } from './Characters'
import { Chats } from './Chat'
import { Global, AppSettings } from './GlobalValues'
import { Instructs } from './Instructs'
import { Presets } from './Presets'
import { humanizedISO8601DateTime } from './Utils'
import { Llama } from './llama'
import { mmkv } from './mmkv'
import { Logger } from './Logger'
import { LlamaTokenizer } from './tokenizer'
import { Style } from './Style'
import { MarkdownStyle } from './Markdown'
export {
    mmkv,
    Presets,
    Instructs,
    Characters,
    Chats,
    Global,
    AppSettings,
    API,
    Llama,
    humanizedISO8601DateTime,
    Logger,
    LlamaTokenizer,
    Style,
    MarkdownStyle,
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

const createDefaultInstructData = async () => {
    await Instructs.generateInitialDefaults().then(() => {
        const defaultid = 1
        mmkv.set(Global.InstructID, JSON.stringify(defaultid))
        Instructs.useInstruct.getState().load(defaultid)
    })
}

const createDefaultUserData = async () => {
    await Characters.createCard('User', 'user').then((id: number) => {
        mmkv.set(Global.UserID, id)
        Characters.useUserCard.getState().setCard(id)
    })
}

export const startupApp = () => {
    console.log('[APP STARTED]: T1APT')

    // Only for dev to properly reset
    Chats.useChat.getState().reset()
    Characters.useCharacterCard.getState().unloadCard()

    // Resets horde state, may be better if left active
    mmkv.set(Global.HordeWorkers, JSON.stringify([]))
    mmkv.set(Global.HordeModels, JSON.stringify([]))

    // Init statea
    if (mmkv.getString(Global.OpenAIModel) === undefined)
        mmkv.set(Global.OpenAIModel, JSON.stringify({}))

    // This was in case of initializing new data into Presets, may change with SQL migration
    mmkv.set(
        Global.PresetData,
        Presets.fixPreset(JSON.parse(mmkv.getString(Global.PresetData) ?? '{}'))
    )

    // default horde [0000000000] key is needed
    if (mmkv.getString(Global.HordeKey) === undefined) mmkv.set(Global.HordeKey, '0000000000')

    // Init step, logs are never null
    if (mmkv.getString(Global.Logs) === undefined) mmkv.set(Global.Logs, JSON.stringify([]))

    // Init step, names[] is never null
    if (mmkv.getString(Global.LorebookNames) === undefined)
        mmkv.set(Global.LorebookNames, JSON.stringify([]))

    // Init step, APIType is never null
    if (mmkv.getString(Global.APIType) === undefined) mmkv.set(Global.APIType, API.KAI)

    if (mmkv.getBoolean(AppSettings.AutoScroll) === undefined)
        mmkv.set(AppSettings.AutoScroll, true)

    if (mmkv.getBoolean(AppSettings.AnimateEditor) === undefined)
        mmkv.set(AppSettings.AnimateEditor, true)

    if (mmkv.getBoolean(AppSettings.CreateFirstMes) === undefined)
        mmkv.set(AppSettings.CreateFirstMes, true)
    // Init step
    Llama.setLlamaPreset()
    Logger.log('Resetting state values for startup.')
    SystemUI.setBackgroundColorAsync(Style.getColor('primary-surface1'))
}

// creates default dirs and default objects

export const initializeApp = async () => {
    await generateDefaultDirectories()

    await Presets.getFileList()
        .then((files) => {
            if (files.length > 0) return
            mmkv.set(Global.PresetData, JSON.stringify(Presets.defaultPreset()))
            Presets.saveFile('Default', Presets.defaultPreset())
            Logger.log('Created default Preset')
        })
        .catch((error) => Logger.log(`Could not generate default Preset. Reason: ${error}`))

    const userid = mmkv.getNumber(Global.UserID)
    if (userid === undefined) {
        Logger.log('User ID is undefined, creating default User')
        await createDefaultUserData()
    } else {
        const list = await Characters.getCardList('user')
        if (!list) {
            Logger.log('Database is Invalid, this should not happen! Please report this occurence.')
        } else if (list?.length === 0) {
            Logger.log('No Instructs exist, creating default Instruct')
            await createDefaultInstructData()
        } else if (!list?.some((item) => item.id === userid)) {
            Logger.log('User ID does not exist in database, defaulting to oldest User')
            Characters.useUserCard.getState().setCard(list[0].id)
        } else Characters.useUserCard.getState().setCard(userid)
    }
    if (!mmkv.getBoolean(Global.GenerateDefaultInstructs)) {
        Logger.log('Default Instructs were not generated yet, now generating.')
        await Instructs.generateInitialDefaults()
    }

    const instructid = mmkv.getNumber(Global.InstructID)
    if (instructid === undefined) {
        Logger.log('Instruct ID is undefined, creating default Instruct')
        await createDefaultInstructData()
    } else {
        Instructs.Database.readList().then(async (list) => {
            if (!list) {
                Logger.log(
                    'Database is Invalid, this should not happen! Please report this occurence.'
                )
            } else if (list?.length === 0) {
                Logger.log('No Instructs exist, creating default Instruct')
                await createDefaultInstructData()
            } else if (!list?.some((item) => item.id === instructid)) {
                Logger.log('Instruct ID does not exist in database, defaulting to oldest Instruct')
                Instructs.useInstruct.getState().load(list[0].id)
            } else Instructs.useInstruct.getState().load(instructid)
        })
    }

    await migratePresets()
}

export const generateDefaultDirectories = async () => {
    // Removed: 'characters', 'instruct', 'persona',
    const dirs = ['presets', 'lorebooks', 'models']

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

// TODO: Migrate to db
