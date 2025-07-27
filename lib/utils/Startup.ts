import { Model } from '@lib/engine/Local/Model'
import { Tokenizer } from '@lib/engine/Tokenizer'
import { setupNotifications } from '@lib/notifications/Notifications'
import { useAppModeStore } from '@lib/state/AppMode'
import { Instructs } from '@lib/state/Instructs'
import { SamplersManager } from '@lib/state/SamplerState'
import { useTTSStore } from '@lib/state/TTS'
import { getThreads } from '@vali98/react-native-cpu-info'
import { getCpuFeatures } from 'cui-llama.rn'
import { DeviceType, getDeviceTypeAsync } from 'expo-device'
import {
    deleteAsync,
    documentDirectory,
    makeDirectoryAsync,
    readAsStringAsync,
    readDirectoryAsync,
} from 'expo-file-system'
import { router } from 'expo-router'
import { setBackgroundColorAsync as setUIBackgroundColor } from 'expo-system-ui'
import { z } from 'zod'

import { AppSettings, AppSettingsDefault, Global } from '../constants/GlobalValues'
import { Llama } from '../engine/Local/LlamaLocal'
import { Characters } from '../state/Characters'
import { Chats } from '../state/Chat'
import { Logger } from '../state/Logger'
import { mmkv } from '../storage/MMKV'
import { Theme } from '../theme/ThemeManager'
import { AppDirectory } from './File'
import { patchAndroidText } from './PatchText'
import { lockScreenOrientation } from './Screen'

export const loadChatOnInit = async () => {
    if (!mmkv.getBoolean(AppSettings.ChatOnStartup)) return
    const newestChat = await Chats.db.query.chatNewest()
    if (!newestChat) return
    await Characters.useCharacterStore.getState().setCard(newestChat.character_id)
    await Chats.useChatState.getState().load(newestChat.id)
    router.push('/screens/ChatScreen')
}

const setAppDefaultSettings = () => {
    Object.keys(AppSettingsDefault).map((item) => {
        const data = mmkv.getBoolean(item)
        if (data !== undefined) return
        if (item === AppSettings.UnlockOrientation) {
            getDeviceTypeAsync().then((result) => {
                mmkv.set(item, result === DeviceType.TABLET)
            })
        } else mmkv.set(item, AppSettingsDefault[item as AppSettings])
    })
}

const createDefaultCard = async () => {
    if (!mmkv.getBoolean(AppSettings.CreateDefaultCard)) return
    const result = await Characters.db.query.cardList('character')
    if (result.length === 0) await Characters.createDefaultCard()
    mmkv.set(AppSettings.CreateDefaultCard, false)
}

const setCPUFeatures = async () => {
    if (mmkv.getString(Global.CpuFeatures)) return
    const result = getCpuFeatures()
    mmkv.set(Global.CpuFeatures, JSON.stringify(result))
}

const migrateModelData_0_7_10_to_0_8_0 = () => {
    // Fix for 0.7.10 -> 0.8.0 LocalModel data
    // Attempt to parse model, if this fails, delete the key
    const oldDef = `localmodel`
    try {
        const model = mmkv.getString(oldDef)
        if (model) JSON.parse(model)
    } catch (e) {
        Logger.warn('Model could not be parsed, resetting')
        mmkv.delete(oldDef)
    }
}

const migrateModelData_0_8_4_to_0_8_5 = () => {
    // `localmodel` is the definition of Global.LocalModel
    const oldDef = `localmodel`
    try {
        const modelData = mmkv.getString(oldDef)
        if (!modelData) return
        const data = JSON.parse(modelData)
        if (!data) return
        mmkv.delete(oldDef)
        Llama.useLlamaPreferencesStore.getState().setLastModelLoaded(data)
    } catch (e) {}
}

const migrateTTSData_0_8_5_to_0_8_6 = () => {
    /** previous Global enum data:
        TTSSpeaker = 'ttsspeaker',
        TTSEnable = 'ttsenable',
        TTSAuto = `ttsauto`, 
    */
    if (mmkv.getBoolean('ttsauto')) {
        mmkv.delete('ttsauto')
        useTTSStore.getState().setAuto(true)
    }
    if (mmkv.getBoolean('ttsenable')) {
        mmkv.delete('ttsenable')
        useTTSStore.getState().setEnabled(true)
    }
    const speakerData = mmkv.getString('ttsspeaker')
    if (speakerData) {
        mmkv.delete('ttsspeaker')
        try {
            const voiceData = JSON.parse(speakerData)
            const voiceSchema = z.object({
                identifier: z.string(),
                name: z.string(),
                quality: z.enum(['Default', 'Enhanced']),
                language: z.string(),
            })
            const result = voiceSchema.safeParse(voiceData)
            if (result.success) {
                useTTSStore.getState().setVoice(voiceData)
            } else throw new Error('Schema validation failed')
        } catch (e) {
            Logger.error('Failed to migrate voice from 0.8.5 to 0.8.6')
        }
    }
}

export const generateDefaultDirectories = async () => {
    // Removed: 'instruct', 'persona', 'presets', 'lorebooks'
    Object.values(AppDirectory).map(async (dir) => {
        await makeDirectoryAsync(`${dir}`, {})
            .then(() =>
                Logger.info(
                    `Successfully made directory: ${dir.replace(`${documentDirectory}`, '')}`
                )
            )
            .catch(() => {})
    })
}

const migratePresets_0_8_3_to_0_8_4 = async () => {
    const presetDir = `${documentDirectory}presets`
    const files = await readDirectoryAsync(presetDir)
    if (files.length === 0) return

    files.map(async (item) => {
        try {
            const data = await readAsStringAsync(`${presetDir}/${item}`)
            SamplersManager.useSamplerStore.getState().addSamplerConfig({
                data: JSON.parse(data),
                name: item.replace('.json', ''),
            })
        } catch (e) {
            Logger.error(`Failed to migrate preset ${item}: ${e}`)
        }
    })
    await deleteAsync(presetDir)
}

const migrateAppMode_0_8_5_to_0_8_6 = () => {
    // Old Global Value AppMode = 'appmode',
    const oldKey = 'appmode'
    const oldAppMode = mmkv.getString(oldKey)
    if (!oldAppMode) return

    if (oldAppMode === 'local' || oldAppMode === 'remote') {
        useAppModeStore.getState().setAppMode(oldAppMode)
    }
    mmkv.delete(oldKey)
    Logger.warn('Migrated appmode from 0.8.5 to 0.8.6')
}

const createDefaultUserData = async () => {
    const id = await Characters.db.mutate.createCard('User', 'user')
    Characters.useUserStore.getState().setCard(id)
}

const setDefaultUser = async () => {
    const userList = await Characters.db.query.cardList('user')
    if (!userList) {
        Logger.error(
            'User database is Invalid, this should not happen! Please report this occurence.'
        )
    } else if (userList?.length === 0) {
        Logger.warn('No Users exist, creating default Users')
        await createDefaultUserData()
    } else if (userList.length > 0 && !Characters.useUserStore.getState().card) {
        Characters.useUserStore.getState().setCard(userList[0].id)
    }
}

const setDefaultInstruct = () => {
    Instructs.db.query.instructList().then(async (list) => {
        if (!list) {
            Logger.error('Instruct database Invalid, this should not happen! Please report this!')
        } else if (list?.length === 0) {
            Logger.warn('No Instructs exist, creating default Instruct')
            const id = await Instructs.generateInitialDefaults()
            Instructs.useInstruct.getState().load(id)
        }
    })
}

const setCPUThreads = () => {
    const threads = mmkv.getNumber(Global.CPUThreads)
    if (threads) return
    let newThreads = 8
    try {
        newThreads = getThreads()
    } catch (e) {
        Logger.error('Failed to set CPU Threads: ' + e)
    }
    Logger.info('Setting CPU Threads to ' + newThreads)
    mmkv.set(Global.CPUThreads, newThreads)
}

export const startupApp = () => {
    console.log('[APP STARTED]: T1APT')
    // DEV: Needed for Reset
    //Chats.useChatState.getState().reset()
    //Characters.useCharacterCard.getState().unloadCard()

    // Sets default preferences
    setAppDefaultSettings()
    generateDefaultDirectories()
    setDefaultUser()
    setDefaultInstruct()

    // setup notifications
    setupNotifications()

    // Initialize the default card
    createDefaultCard()

    // get fp16, i8mm and dotprod data
    setCPUFeatures()

    // set cpu thread count
    setCPUThreads()

    // patch for Bold Text bug
    // refer to https://github.com/Vali-98/ChatterUI/issues/161
    patchAndroidText()

    // Local Model Data in case external models are deleted
    Model.verifyModelList()
    Tokenizer.useTokenizerState.getState().loadModel()
    // migrations for old versions
    migrateModelData_0_7_10_to_0_8_0()
    migrateModelData_0_8_4_to_0_8_5()
    migratePresets_0_8_3_to_0_8_4()
    migrateTTSData_0_8_5_to_0_8_6()
    migrateAppMode_0_8_5_to_0_8_6()

    lockScreenOrientation()

    const backgroundColor = Theme.useColorState.getState().color.neutral._100
    setUIBackgroundColor(backgroundColor)

    Logger.info('Resetting state values for startup.')
}
