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

    // RecentMessages = 'recentmessages', == removed since character list rework to include last_modified

    // InstructID = 'instructid', == removed with instruct persist

    // Management

    CpuFeatures = 'cpufeatures',

    Logs = 'logs',

    // User

    // TODO: use zustand persist to remove this
    UserID = 'userid',

    // Chat

    // Instruct

    // Presets

    PresetID = 'presetID',
    PresetData = 'presetdata',
    PresetName = 'presetdame',

    // Lorebooks

    LorebookNames = 'lorebooknames',

    // APIs

    APIType = 'endpointtype', // name of current api mode

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

    // Local

    LocalModel = 'localmodel',
    LocalModelWeights = 'localdata',
    LocalPreset = 'localpreset',
    LocalSessionLoaded = 'localsessionloaded',

    OpenRouterModel = 'openroutermodel',
    OpenRouterKey = 'openrouterkey',

    OllamaModel = 'ollamamodel',
    //OllamaKey = 'ollamakey',
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
    CohereModel = 'coheremodel',

    TTSSpeaker = 'ttsspeaker',
    TTSEnable = 'ttsenable',
    TTSAuto = `ttsauto`,
    TTSAutoStart = 'ttsautostart',
}

export enum GenerationSettings {
    DisableFirst = 'disablefirst',
    UseFormatter = 'useformatter',
    FormatterTarget = 'formattertarget',
    FormatterSource = 'formattersource',
}

export enum AppSettings {
    DevMode = 'devmode',
    DarkMode = 'darkmode',
    PrimaryHue = 'primaryhue',
    AnimateEditor = 'animateeditor',
    CreateFirstMes = 'createfirstmes',
    ChatOnStartup = 'chatonstartup',
    AutoLoadLocal = 'autoloadlocal',
    AutoScroll = 'autoscroll',
    SendOnEnter = 'sendonenter',
    SaveLocalKV = 'savelocalkv',
    PrintContext = 'printcontext',
    CreateDefaultCard = 'createdefaultcard',
}
