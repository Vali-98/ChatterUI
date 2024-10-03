import { DownloadDirectoryPath, writeFile } from '@dr.pogodin/react-native-fs'
import { getCpuFeatures } from 'cui-llama.rn'
import * as Crypto from 'expo-crypto'
import * as FS from 'expo-file-system'
import * as Sharing from 'expo-sharing'
import * as SystemUI from 'expo-system-ui'
import { Platform } from 'react-native'

import { API } from './API'
import { Characters } from './Characters'
import { Chats } from './Chat'
import { Global, AppSettings } from './GlobalValues'
import { Instructs } from './Instructs'
import { Llama } from './LlamaLocal'
import { Logger } from './Logger'
import { mmkv } from './MMKV'
import { MarkdownStyle } from './Markdown'
import { Presets } from './Presets'
import { Style } from './Style'
import { humanizedISO8601DateTime } from './Utils'

export {
    mmkv,
    Presets,
    Instructs,
    Characters,
    Chats,
    Global,
    AppSettings,
    API,
    humanizedISO8601DateTime,
    Logger,
    Style,
    MarkdownStyle,
}

// GENERAL FUNCTIONS

// reencrypts mmkv cache, may not be useful

export const resetEncryption = (value = 0) => {
    mmkv.recrypt(Crypto.getRandomBytes(16).toString())
}

/** Exports a string to external storage, supports json
 * @deprecated
 */
export const saveStringExternal = async (
    filename: string,
    filedata: string,
    mimetype: 'application/x-sqlite3' | 'application/json' | string = 'application/json',
    encoding: 'utf8' | 'base64' = 'utf8'
) => {
    if (Platform.OS === 'android') {
        const permissions = await FS.StorageAccessFramework.requestDirectoryPermissionsAsync()
        if (permissions.granted) {
            const directoryUri = permissions.directoryUri
            await FS.StorageAccessFramework.createFileAsync(directoryUri, filename, mimetype)
                .then(async (fileUri) => {
                    await FS.writeAsStringAsync(fileUri, filedata, {
                        encoding,
                    })
                    Logger.log(`File saved sucessfully`, true)
                })
                .catch((e) => {
                    Logger.log(e)
                })
        }
    } else if (Platform.OS === 'ios') Sharing.shareAsync(filename)
}

/**
 *
 * @param data string data of file
 * @param filename filename to be written, include extension
 * @param encoding encoding of file
 */
export const saveStringToDownload = async (
    data: string,
    filename: string,
    encoding: 'ascii' | 'base64' | `utf8`
) => {
    await writeFile(`${DownloadDirectoryPath}/${filename}`, data, encoding)
}

/**
 * Default settings on first install
 */
const AppSettingsDefault: Record<AppSettings, boolean | number> = {
    [AppSettings.AnimateEditor]: true,
    [AppSettings.AutoLoadLocal]: false,
    [AppSettings.AutoScroll]: true,
    [AppSettings.ChatOnStartup]: false,
    [AppSettings.CreateFirstMes]: true,
    [AppSettings.DarkMode]: true,
    [AppSettings.DevMode]: false,
    [AppSettings.PrimaryHue]: 270,
    [AppSettings.SendOnEnter]: false,
    [AppSettings.SaveLocalKV]: false,
    [AppSettings.PrintContext]: false,
    [AppSettings.CreateDefaultCard]: true,
}

const loadChatOnInit = async () => {
    const newestChat = await Chats.db.query.chatNewest()
    if (!newestChat) return
    await Characters.useCharacterCard.getState().setCard(newestChat.character_id)
    await Chats.useChat.getState().load(newestChat.id)
}

const createDefaultUserData = async () => {
    await Characters.db.mutate.createCard('User', 'user').then((id: number) => {
        mmkv.set(Global.UserID, id)
        Characters.useUserCard.getState().setCard(id)
    })
}

/**
 * Runs every app start
 */
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
        Presets.fixPreset(
            JSON.parse(mmkv.getString(Global.PresetData) ?? '{}'),
            mmkv.getString(Global.PresetName),
            true
        )
    )

    // default horde [0000000000] key is needed
    if (mmkv.getString(Global.HordeKey) === undefined) mmkv.set(Global.HordeKey, '0000000000')

    // Init step, logs are never null
    if (mmkv.getString(Global.Logs) === undefined) mmkv.set(Global.Logs, JSON.stringify([]))

    // Init step, names[] is never null
    if (mmkv.getString(Global.LorebookNames) === undefined)
        mmkv.set(Global.LorebookNames, JSON.stringify([]))
    // Init step, APIType is never null
    if (mmkv.getString(Global.APIType) === undefined) mmkv.set(Global.APIType, API.LOCAL)

    Object.keys(AppSettingsDefault).map((item) => {
        const data =
            typeof AppSettingsDefault[item as AppSettings] === 'boolean'
                ? mmkv.getBoolean(item)
                : mmkv.getNumber(item)
        if (data === undefined) mmkv.set(item, AppSettingsDefault[item as AppSettings])
    })
    // Init step
    Llama.setLlamaPreset()

    if (mmkv.getBoolean(AppSettings.ChatOnStartup)) {
        loadChatOnInit()
    }

    if (mmkv.getBoolean(AppSettings.CreateDefaultCard)) {
        Characters.db.query.cardList('character').then((result) => {
            if (result.length === 0) Characters.createDefaultCard()
        })
        mmkv.set(AppSettings.CreateDefaultCard, false)
    }

    if (!mmkv.getString(Global.CpuFeatures)) {
        getCpuFeatures().then((result) => {
            mmkv.set(Global.CpuFeatures, JSON.stringify(result))
        })
    }

    Llama.verifyModelList()

    Logger.log('Resetting state values for startup.')
    SystemUI.setBackgroundColorAsync(Style.getColor('primary-surface1'))
}

// creates default dirs and default objects

export const initializeApp = async () => {
    await generateDefaultDirectories()

    await Presets.getFileList()
        .then((files) => {
            if (files.length > 0) return
            mmkv.set(Global.PresetData, JSON.stringify(Presets.defaultPreset))
            Presets.saveFile('Default', Presets.defaultPreset)
            Logger.log('Created default Preset')
        })
        .catch((error) => Logger.log(`Could not generate default Preset. Reason: ${error}`))

    const userid = mmkv.getNumber(Global.UserID)
    if (userid === undefined) {
        Logger.log('User ID is undefined, creating default User')
        await createDefaultUserData()
    } else {
        const list = await Characters.db.query.cardList('user')
        if (!list) {
            Logger.log('Database is Invalid, this should not happen! Please report this occurence.')
        } else if (list?.length === 0) {
            Logger.log('No Instructs exist, creating default Instruct')
            await createDefaultUserData()
        } else if (!list?.some((item) => item.id === userid)) {
            Logger.log('User ID does not exist in database, defaulting to oldest User')
            Characters.useUserCard.getState().setCard(list[0].id)
        } else Characters.useUserCard.getState().setCard(userid)
    }

    Instructs.db.query.instructList().then(async (list) => {
        if (!list) {
            Logger.log('Database Invalid, this should not happen! Please report this!')
        } else if (list?.length === 0) {
            Logger.log('No Instructs exist, creating default Instruct')
            const id = await Instructs.generateInitialDefaults()
            Instructs.useInstruct.getState().load(id)
        }
    })

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
