export const enum Global {
    // Removed - These values are archived incase future issues arise due to unhandled cases

    //CurrentCharacter = 'currentchar', // current char filename, locates dir   == removed on db migration
    //CurrentCharacterCard = 'charcard', // note: use Object ? - stores charactercard   == removed on db migration

    //InstructName = 'instructname', // name of current instruct preset == removed on db migration
    //CurrentInstruct = 'currentinstruct', // note: use Object ? - stores instruct == removed on db migration

    //CurrentUser = 'currentuser', // current username, locates dir == removed on db migration
    //CurrentUserCard = 'usercard', // note: use Object ? - stores usercard == removed on db migration

    // CurrentChat = 'currentchat', // current chat filename, locates dir    == removed on db migration
    //Messages = 'messages', === removed on zustand migration

    // EditedWindow = 'editedwindow', // exit editing window confirmation == never us

    // Processing

    // NowGenerating = 'nowgenerating', // generation signal == removed since migrtion of generating state to db

    // RecentMessages = 'recentmessages', // removed since character list rework to include last_modified

    // InstructID = 'instructid', // removed with instruct persist

    // UserID = 'userid', // moved to zustand state

    // Presets
    // Removed on preset rework
    // PresetID = 'presetID',
    // PresetData = 'presetdata',
    // PresetName = 'presetdame',

    // Lorebooks
    // LorebookNames = 'lorebooknames',  // removed with temp menu

    // APIs

    /**
     * These values are now only used for the legacy system
     * Will likely be removed in future
     * Updated: Deprecated in 0.8.5
     */

    /* APIType = 'endpointtype', // name of current api mode

    KAIEndpoint = 'kaiendpoint', // kai api endpoint

    TGWUIStreamingEndpoint = 'tgwuistreamingendpoint', // tgwui streaming web socket

    HordeKey = 'hordekey', // api key for horde
    HordeModels = 'hordemodel', // names of horde models to be used
    HordeWorkers = 'hordeworker', // List of available horde workers

    MancerKey = 'mancerkey', // api key for mancer
    MancerModel = 'mancermodel', // selected mancer model

    NovelKey = 'novelkey', // novelai key
    NovelModel = 'novelmodel', // novelai model

    AphroditeKey = 'aphroditekey', // api key for aphrodite, default is `EMPTY`

    CompletionsEndpoint = 'completionsendpoint',
    CompletionsKey = 'completionskey',
    CompletionsModel = 'completionsModel',

    OpenAIKey = 'openaikey',
    OpenAIModel = 'openaimodel',

    OpenRouterModel = 'openroutermodel',
    OpenRouterKey = 'openrouterkey',

    OllamaModel = 'ollamamodel',
    OllamaEndpoint = 'ollamaendpoint',

    ClaudeModel = 'claudemodel',
    ClaudeEndpoint = 'claudeendpoint',
    ClaudeAPIKey = 'claudeapikey',
    ClaudePrefill = 'claudeprefill',
    ClaudeFirstMessage = 'claudefirstmessage',

    ChatCompletionsEndpoint = 'chatcompletionsendpoint',
    ChatCompletionsKey = 'chatcompletionskey',
    ChatCompletionsModel = 'chatcompletionsmodel',

    CohereKey = 'coherekey',
    CohereModel = 'coheremodel', */

    // Local - deprecated with move to EngineData

    // object containing model info object based on db schema, needed for auto-loading
    // LocalModel = 'localmodel',
    // preset values for model cpu specs
    // LocalPreset = 'localpreset',
    // whether or not a KV cache has been loaded
    // LocalSessionLoaded = 'localsessionloaded',

    // Logs = 'logs', // moved to zustand state

    // Moved to Zustand state
    // TTSSpeaker = 'ttsspeaker',
    // TTSEnable = 'ttsenable',
    // TTSAuto = `ttsauto`,
    // TTSAutoStart = 'ttsautostart', // moved autoTTS to zustand state

    // Management
    // AppMode = 'appmode', // moved to zustand state

    CpuFeatures = 'global-cpu-features',
    CPUThreads = 'global-cpu-threads',
    InstallTextIntentDisable = 'global-install-text-intent-disable',
}

export enum AppSettings {
    DevMode = 'settings-dev-mode',
    DarkMode = 'settings-dark-mode',
    AnimateEditor = 'settings-animate-editor',
    CreateFirstMes = 'settings-create-first-message',
    ChatOnStartup = 'settings-chat-on-startup',
    AutoLoadLocal = 'settings-auto-load-local',
    AutoScroll = 'settings-auto-scroll',
    SendOnEnter = 'settings-send-on-enter',
    SaveLocalKV = 'settings-save-local-kv',
    PrintContext = 'settings-print-context',
    CreateDefaultCard = 'settings-create-default-card',
    BypassContextLength = 'settings-bypass-context-length',
    NotifyOnComplete = 'settings-notify-on-complete',
    PlayNotificationSound = 'settings-play-notification-sound',
    VibrateNotification = 'settings-vibrate-notification',
    ShowNotificationText = 'settings-show-notification-text',
    LocallyAuthenticateUser = 'settings-locally-authenticate-user',
    UnlockOrientation = 'settings-unlock-orientation',
    UseLegacyAPI = 'settings-use-legacy-api',
    ShowModelInChat = 'settings-show-model-in-chat',
    ShowTags = 'settings-show-tags',
    UseModelTemplate = 'settings-use-model-template',
    ShowTokenPerSecond = 'settings-show-token-per-second',
    AutoLoadUser = 'settings-auto-load-user',
    QuickDelete = 'settings-quickdelete',
    UseTagHider = 'settings-usetaghider',
    SaveScrollPosition = 'settings-savescrollposition',
    ConcurrentGenerations = 'settings-concurrent-generations',
    AutoGenerateTitle = 'settings-auto-generate-title',
    WideChatMode = 'settings-wide-chat-mode',
    AlternatingChatMode = 'settings-alternative-chat-mode',
    KeepAwake = 'settings-keep-awake',
}

/**
 * Default settings on first install
 */
export const AppSettingsDefault: Record<AppSettings, boolean> = {
    [AppSettings.AnimateEditor]: true,
    [AppSettings.AutoLoadLocal]: false,
    [AppSettings.AutoScroll]: true,
    [AppSettings.ChatOnStartup]: false,
    [AppSettings.CreateFirstMes]: true,
    [AppSettings.DarkMode]: true,
    [AppSettings.DevMode]: false,
    [AppSettings.SendOnEnter]: false,
    [AppSettings.SaveLocalKV]: false,
    [AppSettings.PrintContext]: false,
    [AppSettings.CreateDefaultCard]: true,
    [AppSettings.BypassContextLength]: false,
    [AppSettings.NotifyOnComplete]: false,
    [AppSettings.PlayNotificationSound]: false,
    [AppSettings.VibrateNotification]: false,
    [AppSettings.LocallyAuthenticateUser]: false,
    [AppSettings.ShowNotificationText]: false,
    [AppSettings.UnlockOrientation]: false,
    [AppSettings.UseLegacyAPI]: false,
    [AppSettings.ShowModelInChat]: false,
    [AppSettings.ShowTags]: false,
    [AppSettings.UseModelTemplate]: true,
    [AppSettings.ShowTokenPerSecond]: true,
    [AppSettings.AutoLoadUser]: true,
    [AppSettings.QuickDelete]: false,
    [AppSettings.UseTagHider]: true,
    [AppSettings.SaveScrollPosition]: false,
    [AppSettings.AutoGenerateTitle]: true,
    [AppSettings.ConcurrentGenerations]: true,
    [AppSettings.WideChatMode]: false,
    [AppSettings.AlternatingChatMode]: false,
    [AppSettings.KeepAwake]: true,
}

export const CLAUDE_VERSION = '2023-06-01'

export const CONTINUATION_PROMPT_KEY = 'settings-continuation-prompt'
export const DEFAULT_CONTINUATION_PROMPT =
    'Continue the previous response from where it ended. Output only the continuation, without repeating existing text.'
