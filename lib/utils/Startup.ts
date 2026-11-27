import { useTextIntentOnForeground } from '@vali98/react-native-process-text'
import { DeviceType, getDeviceTypeAsync } from 'expo-device'
import { Paths } from 'expo-file-system'
import * as KeepAwake from 'expo-keep-awake'
import { router } from 'expo-router'
import { setBackgroundColorAsync as setUIBackgroundColor } from 'expo-system-ui'
import { t } from 'i18next'
import { z } from 'zod'

import Alert from '@components/views/Alert'
import { migrateData } from '@db/dataMigrations'
import { observeModelDownloads } from '@lib/downloads/models'
import { Model } from '@lib/engine/Local/Model'
import { Tokenizer } from '@lib/engine/Tokenizer'
import { setupNotifications } from '@lib/notifications/Notifications'
import { useOnboardingStore } from '@lib/onboarding/store'
import { useAppModeStore } from '@lib/state/AppMode'
import { useChatInputTextStore } from '@lib/state/components/ChatInput'
import { Instructs } from '@lib/state/Instructs'
import { useSamplerStore } from '@lib/state/samplerStore'
import { useTTSSettingsStore } from '@lib/tts/settingsStore'

import { AppDirectory, deleteFile, listFiles, makeDirectory, readStringAsync } from './File'
import { lockScreenOrientation } from './Screen'
import { AppSettings, AppSettingsDefault } from '../constants/appSettings'
import { Llama } from '../engine/Local/LlamaLocal'
import { Characters } from '../state/characters'
import { Chats } from '../state/chat'
import { Logger } from '../state/Logger'
import { mmkv, restoreResult } from '../storage/MMKV'
import { Theme } from '../theme/ThemeManager'

const loadNewestChat = async () => {
    Logger.info('Loading latest chat')
    const newestChat = await Chats.db.query.latestChat()
    if (!newestChat) return
    Characters.useCharacterState.getState().setCard(newestChat.character_id)
    await Chats.actions.loadChat(newestChat.id)
}

export const loadChatOnInit = async () => {
    if (!mmkv.getBoolean(AppSettings.ChatOnStartup)) return
    await loadNewestChat()
    router.push('/chat')
}

export const useTextIntentFocus = () => {
    return useTextIntentOnForeground(async (text) => {
        if (!text || useOnboardingStore.getState().status !== 'complete') return
        useChatInputTextStore.getState().setText(text)
        if (router.canDismiss()) router.dismissAll()
        router.push('/chat')
        await loadNewestChat()
    }, [])
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
    const result = await Characters.actions.createDefaultCard()
    if (result.success) mmkv.set(AppSettings.CreateDefaultCard, false)
    else Logger.error(result.error)
}

const migrateModelData_0_7_10_to_0_8_0 = () => {
    // Fix for 0.7.10 -> 0.8.0 LocalModel data
    // Attempt to parse model, if this fails, delete the key
    const oldDef = `localmodel`
    try {
        const model = mmkv.getString(oldDef)
        if (model) JSON.parse(model)
    } catch (e) {
        Logger.error('migrateModelData_0_7_10_to_0_8_0 Failed')
        Logger.error(`${e}`)
        mmkv.remove(oldDef)
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
        mmkv.remove(oldDef)
        Llama.useLlamaPreferencesStore.getState().setLastModelLoaded(data)
    } catch (e) {
        Logger.error('migrateModelData_0_8_4_to_0_8_5 Failed')
        Logger.error(`${e}`)
    }
}

const migrateTTSData_0_8_5_to_0_8_6 = () => {
    /** previous Global enum data:
        TTSSpeaker = 'ttsspeaker',
        TTSEnable = 'ttsenable',
        TTSAuto = `ttsauto`, 
    */
    if (mmkv.getBoolean('ttsauto')) {
        mmkv.remove('ttsauto')
        useTTSSettingsStore.getState().setAuto(true)
    }
    if (mmkv.getBoolean('ttsenable')) {
        mmkv.remove('ttsenable')
        useTTSSettingsStore.getState().setEnabled(true)
    }
    const speakerData = mmkv.getString('ttsspeaker')
    if (speakerData) {
        mmkv.remove('ttsspeaker')
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
                useTTSSettingsStore.getState().setVoice(voiceData)
            } else throw new Error('Schema validation failed')
        } catch (e) {
            Logger.error('migrateTTSData_0_8_5_to_0_8_6 Failed')
            Logger.error(`${e}`)
        }
    }
}

export const generateDefaultDirectories = async () => {
    // Removed: 'instruct', 'persona', 'presets', 'lorebooks'
    await Promise.all(Object.values(AppDirectory).map(makeDirectory))
}

const migratePresets_0_8_3_to_0_8_4 = async () => {
    const presetPath = `${Paths.document.uri}presets`
    const files = listFiles(presetPath)

    if (files.length === 0) return
    files.map(async (item) => {
        try {
            const data = await readStringAsync(`${presetPath}/${item}`)
            useSamplerStore.getState().addSamplerConfig({
                data: JSON.parse(data),
                name: item.replace('.json', ''),
            })
        } catch (e) {
            Logger.error(`Failed to migrate preset ${item}: ${e}`)
        }
    })
    deleteFile(presetPath)
}

const migrateAppMode_0_8_5_to_0_8_6 = () => {
    // Old Global Value AppMode = 'appmode',
    const oldKey = 'appmode'
    const oldAppMode = mmkv.getString(oldKey)
    if (!oldAppMode) return

    if (oldAppMode === 'local' || oldAppMode === 'remote') {
        useAppModeStore.getState().setAppMode(oldAppMode)
    }
    mmkv.remove(oldKey)
    Logger.warn('Migrated appmode from 0.8.5 to 0.8.6')
}

const createDefaultUserData = async () => {
    const id = await Characters.db.create.blankCard('User', { type: 'user' })
    Characters.useUserStore.getState().setCard(id)
}

const setDefaultUser = async () => {
    if (!Characters.useUserStore.persist.hasHydrated())
        await Characters.useUserStore.persist.rehydrate()
    const userList = await Characters.db.query.cardList({ type: 'user' })
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

const setKeepAwake = async () => {
    const keepAwake = mmkv.getBoolean(AppSettings.KeepAwake)
    if (keepAwake) KeepAwake.activateKeepAwakeAsync()
    else KeepAwake.deactivateKeepAwake()
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

export const startupApp = async () => {
    await migrateData()
    console.log('[APP STARTED]: T1APT')
    // DEV: Needed for Reset
    //Chats.useChatState.getState().reset()

    // Sets default preferences
    setAppDefaultSettings()
    await generateDefaultDirectories()
    // The default card now imports directly from its bundled Expo asset.
    deleteFile(`${AppDirectory.Assets}aibot.png`)
    await setDefaultUser()
    setDefaultInstruct()

    // setup notifications
    setupNotifications()

    // Initialize the default card
    await createDefaultCard()

    // set keep awake settings
    setKeepAwake()

    // Local Model Data in case external models are deleted
    Model.verifyModelList()
    observeModelDownloads()
    Tokenizer.useTokenizerState.getState().loadModel()

    // Fix any missing samplers
    useSamplerStore.getState().fixConfigs()

    // migrations for old versions
    migrateModelData_0_7_10_to_0_8_0()
    migrateModelData_0_8_4_to_0_8_5()
    migratePresets_0_8_3_to_0_8_4()
    migrateTTSData_0_8_5_to_0_8_6()
    migrateAppMode_0_8_5_to_0_8_6()
    lockScreenOrientation()
    const themeState = Theme.useColorState.getState()
    const backgroundColor = Theme.resolveColor(themeState.colorName, themeState.customColors)
        .neutral._100
    setUIBackgroundColor(backgroundColor)

    if (restoreResult === 'rolledBack') {
        Alert.alert({
            title: t('settings.backup.failed'),
            description: t('settings.backup.rolledBack'),
            buttons: [{ label: t('common.actions.close') }],
        })
    }

    Logger.info('Resetting state values for startup.')
    // note, there is an ancient RN bug where bold text accessibilty breaks
    // text rendering, keep this in mind:
    // https://github.com/react/react-native/issues/53666#issuecomment-3357502528
}
