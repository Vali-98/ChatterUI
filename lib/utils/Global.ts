import { SamplersManager } from '@lib/state/SamplerState'
import { Style } from '@lib/theme/Style'
import { DownloadDirectoryPath, writeFile } from 'cui-fs'
import { getCpuFeatures } from 'cui-llama.rn'
import * as Crypto from 'expo-crypto'
import { DeviceType, getDeviceTypeAsync } from 'expo-device'
import * as FS from 'expo-file-system'
import { lockAsync, OrientationLock } from 'expo-screen-orientation'
import * as Sharing from 'expo-sharing'
import * as SystemUI from 'expo-system-ui'
import { Platform } from 'react-native'
import { btoa } from 'react-native-quick-base64'

import { humanizedISO8601DateTime } from './Utils'
import { API } from '../constants/API'
import { AppMode, AppSettings, AppSettingsDefault, Global } from '../constants/GlobalValues'
import { Llama } from '../engine/LlamaLocal'
import { MarkdownStyle } from '../markdown/Markdown'
import { Characters } from '../state/Characters'
import { Chats } from '../state/Chat'
import { Instructs } from '../state/Instructs'
import { Logger } from '../state/Logger'
import { mmkv } from '../storage/MMKV'

export {
    API,
    AppSettings,
    Characters,
    Chats,
    Global,
    humanizedISO8601DateTime,
    Instructs,
    Logger,
    MarkdownStyle,
    mmkv,
    Style,
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
    if (encoding === 'utf8') data = btoa(data)
    await writeFile(`${DownloadDirectoryPath}/${filename}`, data, { encoding: encoding })
}

const loadChatOnInit = async () => {
    const newestChat = await Chats.db.query.chatNewest()
    if (!newestChat) return
    await Characters.useCharacterCard.getState().setCard(newestChat.character_id)
    await Chats.useChatState.getState().load(newestChat.id)
}

const createDefaultUserData = async () => {
    await Characters.db.mutate.createCard('User', 'user').then((id: number) => {
        Characters.useUserCard.getState().setCard(id)
    })
}

export const lockScreenOrientation = async () => {
    const result = await getDeviceTypeAsync()
    const unlock = mmkv.getBoolean(AppSettings.UnlockOrientation)
    if (unlock ?? result === DeviceType.TABLET) return
    lockAsync(OrientationLock.PORTRAIT)
}

export const unlockScreenOrientation = async () => {
    await unlockScreenOrientation()
}

/**
 * Runs every app start
 */
export const startupApp = () => {
    console.log('[APP STARTED]: T1APT')
    // Only for dev to properly reset
    Chats.useChatState.getState().reset()
    Characters.useCharacterCard.getState().unloadCard()

    // Resets horde state, may be better if left active
    mmkv.set(Global.HordeWorkers, JSON.stringify([]))
    mmkv.set(Global.HordeModels, JSON.stringify([]))

    // Init statea
    if (mmkv.getString(Global.OpenAIModel) === undefined)
        mmkv.set(Global.OpenAIModel, JSON.stringify({}))

    // default horde [0000000000] key is needed
    if (!mmkv.getString(Global.HordeKey)) mmkv.set(Global.HordeKey, '0000000000')

    // Init step, logs are never null
    if (!mmkv.getString(Global.Logs)) mmkv.set(Global.Logs, JSON.stringify([]))

    // Init step, names[] is never null
    if (!mmkv.getString(Global.LorebookNames)) mmkv.set(Global.LorebookNames, JSON.stringify([]))

    // Init step, APIType is never null, if set to deprecated LOCAL mode, change to OpenAI
    if (!mmkv.getString(Global.APIType) || mmkv.getString(Global.APIType) === API.LOCAL)
        mmkv.set(Global.APIType, API.OPENAI)

    // Init step, appMode is never null
    if (!mmkv.getString(Global.AppMode)) mmkv.set(Global.AppMode, AppMode.LOCAL)

    Object.keys(AppSettingsDefault).map((item) => {
        const data =
            typeof AppSettingsDefault[item as AppSettings] === 'boolean'
                ? mmkv.getBoolean(item)
                : mmkv.getNumber(item)
        if (data === undefined) {
            if (item === AppSettings.UnlockOrientation) {
                getDeviceTypeAsync().then((result) => {
                    mmkv.set(item, result === DeviceType.TABLET)
                })
            } else mmkv.set(item, AppSettingsDefault[item as AppSettings])
        }
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

    // Fix for 0.7.10 -> 0.8.0 LocalModel data
    // Attempt to parse model, if this fails, delete the key
    try {
        const model = mmkv.getString(Global.LocalModel)
        if (model) JSON.parse(model)
    } catch (e) {
        Logger.log('Model could not be parsed, resetting')
        mmkv.delete(Global.LocalModel)
    }
    lockScreenOrientation()
    SystemUI.setBackgroundColorAsync(Style.getColor('primary-surface1'))
    Logger.log('Resetting state values for startup.')
}

// creates default dirs and default objects

export const initializeApp = async () => {
    await generateDefaultDirectories()

    const userList = await Characters.db.query.cardList('user')
    if (!userList) {
        Logger.log('Database is Invalid, this should not happen! Please report this occurence.')
    } else if (userList?.length === 0) {
        Logger.log('No Instructs exist, creating default Instruct')
        await createDefaultUserData()
    } else if (userList.length > 0 && !Characters.useUserCard.getState().card) {
        Characters.useUserCard.getState().setCard(userList[0].id)
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
    await Llama.verifyModelList()
}

export const generateDefaultDirectories = async () => {
    // Removed: 'characters', 'instruct', 'persona', 'presets'
    const dirs = ['lorebooks', 'models']

    dirs.map(async (dir: string) => {
        await FS.makeDirectoryAsync(`${FS.documentDirectory}${dir}`, {})
            .then(() => Logger.log(`Successfully made directory: ${dir}`))
            .catch(() => {})
    })
}

const migratePresets = async () => {
    const presetDir = `${FS.documentDirectory}presets`
    const files = await FS.readDirectoryAsync(presetDir)
    if (files.length === 0) return

    files.map(async (item) => {
        try {
            const data = await FS.readAsStringAsync(`${presetDir}/${item}`)
            SamplersManager.useSamplerState.getState().addSamplerConfig({
                data: JSON.parse(data),
                name: item.replace('.json', ''),
            })
        } catch (e) {
            Logger.log(`Failed to migrate preset ${item}: ${e}`)
        }
    })
    await FS.deleteAsync(presetDir)
}
