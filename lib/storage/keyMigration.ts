import type { MMKV } from 'react-native-mmkv'

import { AppSettings, Global } from '@lib/constants/GlobalValues'
import { Storage } from '@lib/enums/Storage'

type KeyStorage = Pick<
    MMKV,
    'contains' | 'getString' | 'getBoolean' | 'getNumber' | 'set' | 'remove'
>

// Only active keys are renamed. Historical keys such as `localmodel`, `appmode` and
// `ttsauto` remain available to the existing data migrations in Startup.ts.
const stringKeys: Record<string, string> = {
    downloads: Storage.Downloads,
    onboarding: Storage.Onboarding,
    guides: Storage.Guides,
    'api-storage': Storage.API,
    'enginedata-storage': Storage.EngineData,
    'kvdata-storage': Storage.KV,
    'textfilter-storage': Storage.TextFilter,
    'appmode-storage': Storage.AppMode,
    'background-image-storage': Storage.BackgroundImage,
    'usercard-storage': Storage.UserCard,
    'instruct-storage': Storage.Instruct,
    'logstate-storage': Storage.Logs,
    'samplerstate-storage': Storage.Samplers,
    'tts-data-storage': Storage.TTS,
    'audio-settings': Storage.AudioSettings,
    'colorscheme-storage': Storage.ColorState,
    'tag-hider-storage': Storage.TagHider,
    'summary-settings': Storage.SummarySettings,
    cpufeatures: Global.CpuFeatures,
}

const booleanKeys: Record<string, string> = {
    devmode: AppSettings.DevMode,
    darkmode: AppSettings.DarkMode,
    animateeditor: AppSettings.AnimateEditor,
    createfirstmes: AppSettings.CreateFirstMes,
    chatonstartup: AppSettings.ChatOnStartup,
    autoloadlocal: AppSettings.AutoLoadLocal,
    autoscroll: AppSettings.AutoScroll,
    sendonenter: AppSettings.SendOnEnter,
    savelocalkv: AppSettings.SaveLocalKV,
    printcontext: AppSettings.PrintContext,
    createdefaultcard: AppSettings.CreateDefaultCard,
    bypasscontextlength: AppSettings.BypassContextLength,
    notifyOnComplete: AppSettings.NotifyOnComplete,
    notifySound: AppSettings.PlayNotificationSound,
    notifyvibrate: AppSettings.VibrateNotification,
    shownotificationtext: AppSettings.ShowNotificationText,
    localauthuser: AppSettings.LocallyAuthenticateUser,
    unlockorientation: AppSettings.UnlockOrientation,
    uselegacyapi: AppSettings.UseLegacyAPI,
    showmodelinchat: AppSettings.ShowModelInChat,
    showtags: AppSettings.ShowTags,
    useModelTemplate: AppSettings.UseModelTemplate,
    showtokenpersecond: AppSettings.ShowTokenPerSecond,
    autoloaduser: AppSettings.AutoLoadUser,
    'install-text-intent-disable': Global.InstallTextIntentDisable,
}

const numberKeys: Record<string, string> = {
    'constants-cpu-threads': Global.CPUThreads,
}

// Run before Zustand hydration or any startup/default initialization. Keep JSON
// envelopes intact so each store's existing version migrations still apply.
// Checking aliases each launch also supports restored older storage files.
export const migrateMMKVKeys = (storage: KeyStorage) => {
    const groups = [
        { keys: stringKeys, read: (key: string) => storage.getString(key) },
        { keys: booleanKeys, read: (key: string) => storage.getBoolean(key) },
        { keys: numberKeys, read: (key: string) => storage.getNumber(key) },
    ]
    for (const { keys, read } of groups) {
        for (const [oldKey, newKey] of Object.entries(keys)) {
            if (!storage.contains(oldKey)) continue
            if (!storage.contains(newKey)) {
                const value = read(oldKey)
                // Leave unrecognized values untouched rather than deleting data.
                if (value === undefined) continue
                storage.set(newKey, value)
            }
            // A newer value wins when both exist. Also finishes an interrupted move
            // that wrote its destination before removing the old key.
            storage.remove(oldKey)
        }
    }
}
